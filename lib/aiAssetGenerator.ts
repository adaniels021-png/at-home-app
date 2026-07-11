// lib/aiAssetGenerator.ts

import {
  AiAssetItem,
  AiAssetType,
  AiAssetUsageScope,
  normalizeAssetKey,
} from './aiAssetLibrary';
import { supabase } from './supabase';

export type AiAssetGenerationStatus =
  | 'draft'
  | 'generating'
  | 'generated'
  | 'saved'
  | 'failed';

export type AiAssetGenerationDraft = {
  id: string;
  prompt: string;
  negative_prompt: string | null;

  asset_key: string | null;
  title: string | null;
  description: string | null;

  asset_type: AiAssetType | null;
  primary_category: string | null;
  secondary_category: string | null;
  primary_skill: string | null;
  style: string | null;
  usage_scope: AiAssetUsageScope[] | null;
  age_range: string | null;
  tags: string[] | null;

  generated_image_url: string | null;
  generated_storage_path: string | null;

  status: AiAssetGenerationStatus;
  error_message: string | null;

  transparent: boolean | null;
  bun_bun_ready: boolean | null;
  premium: boolean | null;

  created_at?: string;
  updated_at?: string;
};

export type CreateAiAssetGenerationInput = {
  prompt: string;
  negativePrompt?: string;

  assetKey?: string;
  title?: string;
  description?: string;

  assetType?: AiAssetType;
  primaryCategory?: string;
  secondaryCategory?: string;
  primarySkill?: string;
  style?: string;
  usageScope?: AiAssetUsageScope[];
  ageRange?: string;
  tags?: string[];

  transparent?: boolean;
  bunBunReady?: boolean;
  premium?: boolean;
};

export type CompleteAiAssetGenerationInput = {
  id: string;
  generatedImageUrl: string;
  generatedStoragePath?: string;
};

export type SaveGeneratedAssetInput = {
  draft: AiAssetGenerationDraft;
};

export type GenerateMissingWorksheetAssetsInput = {
  worksheetQueueId: string;
  missingAssetKeys?: string[];
};

export type GenerateMissingWorksheetAssetsResult = {
  success: boolean;
  mode?: 'worksheet_missing_assets';
  worksheetQueueId?: string;
  requested?: number;
  generated?: AiAssetItem[];
  skippedExisting?: string[];
  failed?: Array<{
    assetKey: string;
    error: string;
  }>;
  message?: string;
  error?: string;
};

const GENERATION_TABLE = 'ai_asset_generation_queue';
const ASSET_TABLE = 'ai_assets';

function normalizeList(values?: string[]) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function getFallbackAssetKey(title?: string | null, prompt?: string | null) {
  const source = title || prompt || `asset-${Date.now()}`;
  return normalizeAssetKey(source).slice(0, 80);
}

function getEdgeFunctionErrorMessage(error: any) {
  if (!error) return 'Unknown Edge Function error.';

  const parts = [error.message || 'Edge Function failed.'];

  try {
    const context = error?.context;

    if (typeof context === 'string') {
      parts.push(context);
    } else if (context) {
      parts.push(JSON.stringify(context));
    }
  } catch {
    // Ignore context formatting failures.
  }

  return parts.filter(Boolean).join(' — ');
}

export function buildPremiumAssetPrompt(input: {
  title?: string;
  description?: string;
  assetType?: AiAssetType;
  primaryCategory?: string;
  primarySkill?: string;
  style?: string;
  ageRange?: string;
  transparent?: boolean;
}) {
  const style = input.style || 'Premium Cartoon';
  const transparentText = input.transparent
    ? 'transparent background, isolated object, no border, no text'
    : 'clean simple background';

  return [
    `Create a ${style} children’s educational app illustration.`,
    input.title ? `Main subject: ${input.title}.` : null,
    input.description ? `Details: ${input.description}.` : null,
    input.assetType ? `Asset type: ${input.assetType}.` : null,
    input.primaryCategory ? `Category: ${input.primaryCategory}.` : null,
    input.primarySkill ? `Skill focus: ${input.primarySkill}.` : null,
    input.ageRange ? `Designed for children ${input.ageRange}.` : null,
    `Kid-friendly, bright, polished, high-quality, rounded shapes, clean edges, cheerful but not overstimulating.`,
    `Use a premium children’s activity book style.`,
    transparentText,
    `Do not include words, labels, logos, watermarks, extra hands, distorted objects, scary expressions, or clutter.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function createAiAssetGenerationDraft(
  input: CreateAiAssetGenerationInput
) {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error('Prompt is required.');
  }

  const assetKey = input.assetKey
    ? normalizeAssetKey(input.assetKey)
    : getFallbackAssetKey(input.title, prompt);

  const record = {
    prompt,
    negative_prompt: cleanText(input.negativePrompt),

    asset_key: assetKey,
    title: cleanText(input.title),
    description: cleanText(input.description),

    asset_type: input.assetType || 'object',
    primary_category: cleanText(input.primaryCategory),
    secondary_category: cleanText(input.secondaryCategory),
    primary_skill: cleanText(input.primarySkill),
    style: cleanText(input.style) || 'Premium Cartoon',
    usage_scope: input.usageScope?.length ? input.usageScope : ['worksheets'],
    age_range: cleanText(input.ageRange),
    tags: normalizeList(input.tags),

    status: 'draft',
    error_message: null,

    transparent: input.transparent ?? true,
    bun_bun_ready: input.bunBunReady ?? false,
    premium: input.premium ?? true,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(GENERATION_TABLE)
    .insert(record)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Create generation draft failed: ${error.message}`);
  }

  return data as AiAssetGenerationDraft;
}

export async function listAiAssetGenerationDrafts() {
  const { data, error } = await supabase
    .from(GENERATION_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Load generation drafts failed: ${error.message}`);
  }

  return (data || []) as AiAssetGenerationDraft[];
}

export async function getAiAssetGenerationDraft(id: string) {
  const { data, error } = await supabase
    .from(GENERATION_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Load generation draft failed: ${error.message}`);
  }

  return data as AiAssetGenerationDraft | null;
}

export async function updateAiAssetGenerationStatus(
  id: string,
  status: AiAssetGenerationStatus,
  errorMessage?: string | null
) {
  const { data, error } = await supabase
    .from(GENERATION_TABLE)
    .update({
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Update generation status failed: ${error.message}`);
  }

  return data as AiAssetGenerationDraft;
}

export async function completeAiAssetGeneration(
  input: CompleteAiAssetGenerationInput
) {
  if (!input.generatedImageUrl.trim()) {
    throw new Error('Generated image URL is required.');
  }

  const { data, error } = await supabase
    .from(GENERATION_TABLE)
    .update({
      generated_image_url: input.generatedImageUrl.trim(),
      generated_storage_path: input.generatedStoragePath || null,
      status: 'generated',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Complete generation failed: ${error.message}`);
  }

  return data as AiAssetGenerationDraft;
}

export async function saveGeneratedAssetToLibrary({
  draft,
}: SaveGeneratedAssetInput) {
  if (!draft.generated_image_url) {
    throw new Error('This draft does not have a generated image yet.');
  }

  const assetKey = draft.asset_key
    ? normalizeAssetKey(draft.asset_key)
    : getFallbackAssetKey(draft.title, draft.prompt);

  const record = {
    asset_key: assetKey,
    title: draft.title?.trim() || assetKey,
    description: draft.description?.trim() || draft.prompt,
    asset_type: draft.asset_type || 'object',
    primary_category: draft.primary_category,
    secondary_category: draft.secondary_category,
    primary_skill: draft.primary_skill,
    style: draft.style || 'Premium Cartoon',
    usage_scope: draft.usage_scope?.length ? draft.usage_scope : ['worksheets'],
    age_range: draft.age_range,
    tags: draft.tags || [],
    transparent: draft.transparent ?? true,
    bun_bun_ready: draft.bun_bun_ready ?? false,
    premium: draft.premium ?? true,
    image_url: draft.generated_image_url,
    storage_path:
      draft.generated_storage_path || `generated-ai-assets/${assetKey}.png`,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(ASSET_TABLE)
    .upsert(record, { onConflict: 'asset_key' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Save generated asset failed: ${error.message}`);
  }

  await updateAiAssetGenerationStatus(draft.id, 'saved');

  return data as AiAssetItem;
}

export async function deleteAiAssetGenerationDraft(id: string) {
  const { error } = await supabase.from(GENERATION_TABLE).delete().eq('id', id);

  if (error) {
    throw new Error(`Delete generation draft failed: ${error.message}`);
  }

  return true;
}

export async function generateImageForAiAssetDraft(draftId: string) {
  const { data, error } = await supabase.functions.invoke(
    'generate-ai-asset-image',
    {
      body: { draftId },
    }
  );

  console.log('EDGE FUNCTION DATA:', data);
  console.log('EDGE FUNCTION ERROR:', error);

  if (error) {
    throw new Error(`Image generation failed: ${getEdgeFunctionErrorMessage(error)}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Image generation failed.');
  }

  return data;
}

export async function generateMissingWorksheetAssets({
  worksheetQueueId,
  missingAssetKeys,
}: GenerateMissingWorksheetAssetsInput): Promise<GenerateMissingWorksheetAssetsResult> {
  if (!worksheetQueueId?.trim()) {
    throw new Error('worksheetQueueId is required.');
  }

  const normalizedMissingAssetKeys = normalizeList(missingAssetKeys);

const { data, error } = await supabase.functions.invoke(
  'generate-ai-asset-image',
    {
      body: {
        worksheetQueueId: worksheetQueueId.trim(),
        missingAssetKeys: normalizedMissingAssetKeys,
      },
    }
  );

  console.log('MISSING ASSET EDGE FUNCTION DATA:', data);
  console.log('MISSING ASSET EDGE FUNCTION ERROR:', error);

  if (error) {
    throw new Error(
      `Missing worksheet asset generation failed: ${getEdgeFunctionErrorMessage(error)}`
    );
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Missing worksheet asset generation failed.');
  }

  return data as GenerateMissingWorksheetAssetsResult;
}
