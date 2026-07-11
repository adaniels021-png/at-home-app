// supabase/functions/generate-ai-asset-image/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type GenerateRequestBody = {
  draftId?: string;
  worksheetQueueId?: string;
  prompt?: string;
};

type GeminiInlinePart = {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  inline_data?: {
    mime_type?: string;
    data?: string;
  };
  text?: string;
};

type WorksheetLayoutJson = {
  title?: string;
  category?: string;
  difficulty?: string;
  layoutType?: string;
  missingAssetKeys?: string[];
  imageBlocks?: Array<{
    id?: string;
    assetKey?: string;
    label?: string;
  }>;
};

type WorksheetQueueRow = {
  id: string;
  title: string | null;
  category: string | null;
  difficulty: string | null;
  child_name: string | null;
  description: string | null;
  practice_note: string | null;
  layout_json: WorksheetLayoutJson | null;
  worksheet_dna: any | null;
  full_page_art_prompt: string | null;
  full_page_art_url: string | null;
  full_page_art_storage_path: string | null;
};

type AssetPromptInfo = {
  assetKey: string;
  title: string;
  description: string;
  prompt: string;
  category: string | null;
  primarySkill: string | null;
  tags: string[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET_NAME = 'worksheet-art';
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const ASSET_TABLE = 'ai_assets';
const GENERATION_TABLE = 'ai_asset_generation_queue';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeAssetKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(normalizeAssetKey).filter(Boolean)));
}

function toTitleCase(value?: string | null) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

function getAssetLabelFromWorksheet(worksheet: WorksheetQueueRow, assetKey: string) {
  const normalized = normalizeAssetKey(assetKey);
  const block = worksheet.layout_json?.imageBlocks?.find(
    (item) => normalizeAssetKey(item.assetKey || '') === normalized
  );

  if (block?.label) return block.label;

  return toTitleCase(assetKey);
}

function getWorksheetTargetSkill(worksheet: WorksheetQueueRow) {
  return (
    worksheet.worksheet_dna?.targetSkill ||
    worksheet.worksheet_dna?.target_skill ||
    worksheet.title ||
    'Skill Practice'
  );
}

function buildPremiumSingleAssetPrompt(input: {
  assetKey: string;
  title: string;
  worksheetTitle?: string | null;
  category?: string | null;
  difficulty?: string | null;
  targetSkill?: string | null;
  layoutType?: string | null;
}) {
  return [
    `Create ONE premium children's worksheet illustration asset only.`,
    `Subject: ${input.title}.`,
    `Asset key: ${input.assetKey}.`,
    input.worksheetTitle ? `Worksheet: ${input.worksheetTitle}.` : null,
    input.targetSkill ? `Target skill: ${input.targetSkill}.` : null,
    input.category ? `Category: ${input.category}.` : null,
    input.difficulty ? `Difficulty: ${input.difficulty}.` : null,
    input.layoutType ? `Worksheet layout type: ${input.layoutType}.` : null,
    `Use a premium preschool activity-book illustration style.`,
    `Warm, polished, colorful, friendly, professional, and print-quality.`,
    `Use clean outlines, soft rounded shapes, gentle shadows, expressive friendly characters when a person is needed, and bright calming colors.`,
    `Make the subject large, centered, simple, and easy for a young child to understand.`,
    `Use a clean white or transparent-feeling background so this asset can fit inside a worksheet card.`,
    `Do not create a full worksheet page.`,
    `Do not include page borders, worksheet title, step numbers, labels, captions, logos, watermarks, letters, or words.`,
    `Do not create app UI or a phone screen.`,
    `Avoid clutter, tiny details, scary expressions, distorted hands, extra fingers, or clinical icon style.`,
  ]
    .filter(Boolean)
    .join(' ');
}

function getMissingKeysFromWorksheet(worksheet: WorksheetQueueRow) {
  const layoutKeys = worksheet.layout_json?.missingAssetKeys || [];

  if (layoutKeys.length) {
    return unique(layoutKeys);
  }

  const imageBlockKeys =
    worksheet.layout_json?.imageBlocks
      ?.map((block) => block.assetKey || '')
      .filter(Boolean) || [];

  return unique(imageBlockKeys);
}

async function callGeminiImageApi(prompt: string, apiKey: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini failed: ${response.status} ${rawText}`);
  }

  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${rawText}`);
  }

  const parts: GeminiInlinePart[] =
    data?.candidates?.[0]?.content?.parts || [];

  const imagePart = parts.find((part) =>
    Boolean(part.inlineData?.data || part.inline_data?.data)
  );

  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  if (!inlineData?.data) {
    throw new Error(
      `Gemini did not return image data. Response: ${JSON.stringify(data)}`
    );
  }

  return {
    base64: inlineData.data,
    mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png',
  };
}

async function uploadGeneratedImage(input: {
  supabase: any;
  prompt: string;
  storagePath: string;
  geminiApiKey: string;
}) {
  const generated = await callGeminiImageApi(input.prompt, input.geminiApiKey);

  const extension = getExtensionFromMimeType(generated.mimeType);
  const finalStoragePath = input.storagePath.endsWith(`.${extension}`)
    ? input.storagePath
    : `${input.storagePath}.${extension}`;

  const imageBytes = base64ToUint8Array(generated.base64);

  const { error: uploadError } = await input.supabase.storage
    .from(BUCKET_NAME)
    .upload(finalStoragePath, imageBytes, {
      contentType: generated.mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = input.supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(finalStoragePath);

  return {
    imageUrl: publicData.publicUrl,
    storagePath: finalStoragePath,
    mimeType: generated.mimeType,
  };
}

async function upsertAssetToLibrary(input: {
  supabase: any;
  asset: AssetPromptInfo;
  imageUrl: string;
  storagePath: string;
}) {
  const record = {
    asset_key: input.asset.assetKey,
    title: input.asset.title,
    description: input.asset.description,
    asset_type: 'object',
    primary_category: input.asset.category,
    secondary_category: null,
    primary_skill: input.asset.primarySkill,
    style: 'Premium Cartoon',
    usage_scope: ['worksheets'],
    age_range: '2-8',
    tags: input.asset.tags,
    transparent: true,
    bun_bun_ready: false,
    premium: true,
    image_url: input.imageUrl,
    storage_path: input.storagePath,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await input.supabase
    .from(ASSET_TABLE)
    .upsert(record, { onConflict: 'asset_key' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Save asset to library failed: ${error.message}`);
  }

  return data;
}

async function getExistingAssetKeys(input: { supabase: any; keys: string[] }) {
  if (!input.keys.length) return new Set<string>();

  const { data, error } = await input.supabase
    .from(ASSET_TABLE)
    .select('asset_key,image_url')
    .in('asset_key', input.keys);

  if (error) {
    throw new Error(`Could not check existing assets: ${error.message}`);
  }

  return new Set(
    (data || [])
      .filter((asset: any) => asset.asset_key && asset.image_url)
      .map((asset: any) => normalizeAssetKey(asset.asset_key))
  );
}

async function handleAssetDraftGeneration(input: {
  supabase: any;
  draftId: string;
  promptOverride?: string;
  geminiApiKey: string;
}) {
  const { data: draft, error: draftError } = await input.supabase
    .from(GENERATION_TABLE)
    .select('*')
    .eq('id', input.draftId)
    .single();

  if (draftError) {
    throw new Error(`Could not load draft: ${draftError.message}`);
  }

  const prompt = input.promptOverride?.trim() || draft.prompt;

  if (!prompt) {
    throw new Error('No prompt found for this asset draft.');
  }

  await input.supabase
    .from(GENERATION_TABLE)
    .update({
      status: 'generating',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.draftId);

  const assetKey = normalizeAssetKey(
    draft.asset_key || draft.title || input.draftId
  );

  const uploaded = await uploadGeneratedImage({
    supabase: input.supabase,
    prompt,
    storagePath: `generated-ai-assets/${assetKey}-${Date.now()}`,
    geminiApiKey: input.geminiApiKey,
  });

  const { data: updatedDraft, error: updateError } = await input.supabase
    .from(GENERATION_TABLE)
    .update({
      generated_image_url: uploaded.imageUrl,
      generated_storage_path: uploaded.storagePath,
      status: 'generated',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.draftId)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(`Could not update draft: ${updateError.message}`);
  }

  return {
    success: true,
    mode: 'asset_draft',
    draft: updatedDraft,
    generatedImageUrl: uploaded.imageUrl,
    generatedStoragePath: uploaded.storagePath,
  };
}

async function handleWorksheetMissingAssetGeneration(input: {
  supabase: any;
  worksheetQueueId: string;
  promptOverride?: string;
  geminiApiKey: string;
}) {
  const { data: worksheet, error: worksheetError } = await input.supabase
    .from('worksheet_queue')
    .select(
      'id,title,category,difficulty,child_name,description,practice_note,layout_json,worksheet_dna,full_page_art_prompt,full_page_art_url,full_page_art_storage_path'
    )
    .eq('id', input.worksheetQueueId)
    .single();

  if (worksheetError) {
    throw new Error(`Could not load worksheet draft: ${worksheetError.message}`);
  }

  const typedWorksheet = worksheet as WorksheetQueueRow;

  if (!typedWorksheet.layout_json) {
    throw new Error(
      'This worksheet does not have layout_json yet, so missing asset generation cannot run.'
    );
  }

  const requestedKeys = getMissingKeysFromWorksheet(typedWorksheet);

  if (!requestedKeys.length) {
    return {
      success: true,
      mode: 'worksheet_missing_assets',
      worksheet: typedWorksheet,
      requested: 0,
      generated: [],
      skippedExisting: [],
      message: 'No missing asset keys found for this worksheet.',
    };
  }

  await input.supabase
    .from('worksheet_queue')
    .update({
      status: 'generating_assets',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.worksheetQueueId);

  const existingKeys = await getExistingAssetKeys({
    supabase: input.supabase,
    keys: requestedKeys,
  });

  const keysToGenerate = requestedKeys.filter((key) => !existingKeys.has(key));
  const skippedExisting = requestedKeys.filter((key) => existingKeys.has(key));

  const generatedAssets: any[] = [];
  const failedAssets: Array<{ assetKey: string; error: string }> = [];

  for (const assetKey of keysToGenerate) {
    try {
      const title = getAssetLabelFromWorksheet(typedWorksheet, assetKey);
      const targetSkill = getWorksheetTargetSkill(typedWorksheet);
      const prompt =
        input.promptOverride?.trim() ||
        buildPremiumSingleAssetPrompt({
          assetKey,
          title,
          worksheetTitle: typedWorksheet.title,
          category: typedWorksheet.category,
          difficulty: typedWorksheet.difficulty,
          targetSkill,
          layoutType: typedWorksheet.layout_json?.layoutType,
        });

      const assetInfo: AssetPromptInfo = {
        assetKey,
        title,
        description: `Premium worksheet illustration for ${title}.`,
        prompt,
        category: typedWorksheet.category,
        primarySkill: targetSkill,
        tags: unique([
          typedWorksheet.category || '',
          targetSkill || '',
          typedWorksheet.layout_json?.layoutType || '',
          assetKey,
          'worksheet',
          'premium',
        ]),
      };

      const uploaded = await uploadGeneratedImage({
        supabase: input.supabase,
        prompt,
        storagePath: `generated-ai-assets/${assetKey}-${Date.now()}`,
        geminiApiKey: input.geminiApiKey,
      });

      const savedAsset = await upsertAssetToLibrary({
        supabase: input.supabase,
        asset: assetInfo,
        imageUrl: uploaded.imageUrl,
        storagePath: uploaded.storagePath,
      });

      generatedAssets.push(savedAsset);
    } catch (assetError) {
      failedAssets.push({
        assetKey,
        error:
          assetError instanceof Error
            ? assetError.message
            : 'Unknown asset generation error.',
      });
    }
  }

  const finalStatus = failedAssets.length ? 'asset_generation_partial' : 'pending';

  await input.supabase
    .from('worksheet_queue')
    .update({
      status: finalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.worksheetQueueId);

  return {
    success: failedAssets.length === 0,
    mode: 'worksheet_missing_assets',
    worksheet: typedWorksheet,
    requested: requestedKeys.length,
    skippedExisting,
    generated: generatedAssets,
    failed: failedAssets,
    message: failedAssets.length
      ? `Generated ${generatedAssets.length} asset(s), but ${failedAssets.length} failed.`
      : `Generated ${generatedAssets.length} missing asset(s).`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
  }

  let body: GenerateRequestBody | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase Edge Function environment variables.');
    }

    if (!geminiApiKey) {
      throw new Error('Missing GEMINI_API_KEY secret.');
    }

    body = (await req.json()) as GenerateRequestBody;
    console.log('Request body:', body);

    if (!body.draftId && !body.worksheetQueueId) {
      throw new Error('draftId or worksheetQueueId is required.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (body.worksheetQueueId) {
      const result = await handleWorksheetMissingAssetGeneration({
        supabase,
        worksheetQueueId: body.worksheetQueueId,
        promptOverride: body.prompt,
        geminiApiKey,
      });

      return jsonResponse(result);
    }

    if (body.draftId) {
      const result = await handleAssetDraftGeneration({
        supabase,
        draftId: body.draftId,
        promptOverride: body.prompt,
        geminiApiKey,
      });

      return jsonResponse(result);
    }

    throw new Error('No valid generation mode found.');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown generation error.';

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && serviceRoleKey && body) {
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        if (body.draftId) {
          await supabase
            .from(GENERATION_TABLE)
            .update({
              status: 'failed',
              error_message: message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', body.draftId);
        }

        if (body.worksheetQueueId) {
          await supabase
            .from('worksheet_queue')
            .update({
              status: 'art_failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', body.worksheetQueueId);
        }
      }
    } catch {
      // Ignore secondary error logging failure.
    }

    return jsonResponse({ success: false, error: message }, 500);
  }
});
