import {
  authorizeIllustrationAdmin,
  IllustrationHttpError,
  isMissingIllustrationStorage,
} from '../_shared/activity-illustration-auth.ts';
import {
  ACTIVITY_ILLUSTRATION_PROMPT_VERSION,
  buildActivityIllustrationPrompt,
  sha256Hex,
} from '../_shared/activity-illustration-prompt.ts';
import {
  createGeminiImageAdapter,
  GEMINI_IMAGE_MODEL,
  GeminiImageProviderError,
} from '../_shared/activity-illustration-gemini.ts';
import {
  extractProviderImage,
  validateActivityIllustration,
} from '../_shared/activity-illustration-image.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ALLOWED_FIELDS = new Set([
  'activity_id', 'generation_reason', 'idempotency_key',
  'expected_approved_illustration_id',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function parseBody(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new IllustrationHttpError(400, 'INVALID_REQUEST');
  if (Object.keys(value).some((field) => !ALLOWED_FIELDS.has(field))) throw new IllustrationHttpError(400, 'UNKNOWN_REQUEST_FIELD');
  if (!UUID.test(value.activity_id) || !UUID.test(value.idempotency_key)) throw new IllustrationHttpError(400, 'INVALID_REQUEST');
  if (!['missing', 'regenerate'].includes(value.generation_reason)) throw new IllustrationHttpError(400, 'INVALID_REQUEST');
  if (value.expected_approved_illustration_id != null && !UUID.test(value.expected_approved_illustration_id)) throw new IllustrationHttpError(400, 'INVALID_REQUEST');
  return value as {
    activity_id: string;
    generation_reason: 'missing' | 'regenerate';
    idempotency_key: string;
    expected_approved_illustration_id?: string | null;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return response({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const started = Date.now();
  let illustrationId: string | null = null;
  try {
    const { userClient, serviceClient } = await authorizeIllustrationAdmin(req);
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch { throw new IllustrationHttpError(400, 'INVALID_JSON'); }
    const body = parseBody(rawBody);

    const { data: reservations, error: reservationError } = await userClient.rpc(
      'reserve_activity_illustration_generation',
      {
        target_activity_id: body.activity_id,
        target_generation_reason: body.generation_reason,
        target_idempotency_key: body.idempotency_key,
        expected_current_approved_illustration_id:
          body.expected_approved_illustration_id ?? null,
      },
    );
    if (reservationError) throw new IllustrationHttpError(409, reservationError.message.includes('RATE_LIMIT') || reservationError.message.includes('COOLDOWN') ? 'GENERATION_RATE_LIMITED' : 'GENERATION_NOT_ALLOWED');
    const job = Array.isArray(reservations) ? reservations[0] : reservations;
    if (!job || job.activity_id !== body.activity_id) throw new Error('RESERVATION_IDENTITY_MISMATCH');
    illustrationId = job.illustration_id;

    const { data: current, error: currentError } = await serviceClient
      .from('activity_illustrations')
      .select('id,status,version,source_content_hash')
      .eq('id', illustrationId)
      .single();
    if (currentError || !current) throw new Error('RESERVED_JOB_NOT_FOUND');
    if (current.status !== 'generating') {
      return response({ illustration_id: current.id, status: current.status, version: current.version, resumed: true });
    }

    const { data: claimed, error: claimError } = await serviceClient.rpc(
      'claim_activity_illustration_provider_call',
      { target_illustration_id: current.id, target_idempotency_key: body.idempotency_key },
    );
    if (claimError) throw new Error('PROVIDER_CLAIM_FAILED');
    if (claimed !== true) return response({ illustration_id: current.id, status: 'generating', version: current.version, resumed: true }, 202);

    const { data: activity, error: activityError } = await serviceClient
      .from('activity_library')
      .select('id,title,category,location,description,try_this,materials,why_it_helps,status')
      .eq('id', body.activity_id)
      .single();
    if (activityError || !activity || activity.id !== job.activity_id || activity.status !== 'approved') throw new Error('CANONICAL_ACTIVITY_INVALID');
    const { data: canonicalHash, error: hashError } = await serviceClient.rpc(
      'activity_illustration_source_content_hash', { target_activity_id: activity.id },
    );
    if (hashError || canonicalHash !== job.source_content_hash) throw new Error('CANONICAL_CONTENT_CHANGED');

    const prompt = buildActivityIllustrationPrompt(activity);
    const promptHash = await sha256Hex(prompt);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('PROVIDER_NOT_CONFIGURED');
    const providerPayload = await createGeminiImageAdapter()(prompt, apiKey);
    const image = validateActivityIllustration(extractProviderImage(providerPayload));
    const imageHash = await sha256Hex(image.bytes);
    const draftPath = `${activity.id}/${current.id}/draft.${image.extension}`;
    const { error: uploadError } = await serviceClient.storage
      .from('activity-illustration-drafts')
      .upload(draftPath, image.bytes, { contentType: image.declaredMimeType, upsert: false });
    if (uploadError) {
      if (isMissingIllustrationStorage(uploadError)) {
        throw new IllustrationHttpError(503, 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE');
      }
      throw new Error('DRAFT_UPLOAD_FAILED');
    }

    const { data: draft, error: transitionError } = await serviceClient.rpc(
      'mark_activity_illustration_draft',
      {
        target_illustration_id: current.id,
        target_draft_storage_path: draftPath,
        target_prompt_version: ACTIVITY_ILLUSTRATION_PROMPT_VERSION,
        target_prompt_hash: promptHash,
        target_prompt_snapshot: prompt,
        target_provider: 'google-gemini',
        target_model: GEMINI_IMAGE_MODEL,
        target_mime_type: image.declaredMimeType,
        target_width: image.width,
        target_height: image.height,
        target_byte_size: image.bytes.length,
        target_sha256: imageHash,
      },
    );
    if (transitionError) {
      // The exact attributable private object is safe to remove because the
      // relational transition never made it reviewable.
      await serviceClient.storage.from('activity-illustration-drafts').remove([draftPath]);
      throw new Error('DRAFT_TRANSITION_FAILED');
    }
    console.log(JSON.stringify({ event: 'activity_illustration_generated', activity_id: activity.id, illustration_id: current.id, duration_ms: Date.now() - started }));
    return response({ illustration_id: current.id, status: draft.status, version: draft.version });
  } catch (error) {
    const known = error instanceof IllustrationHttpError;
    const providerError = error instanceof GeminiImageProviderError ? error : null;
    const code = known
      ? error.code
      : providerError?.code || String((error as Error)?.message || 'GENERATION_FAILED').replace(/[^A-Z0-9_]/g, '_').slice(0, 80);
    if (illustrationId && !known) {
      try {
        const { serviceClient } = await authorizeIllustrationAdmin(req);
        await serviceClient.rpc('mark_activity_illustration_failed', {
          target_illustration_id: illustrationId,
          target_error_code: code,
          target_error_message: 'Illustration generation could not be completed.',
        });
      } catch { /* original failure remains authoritative */ }
    }
    console.log(JSON.stringify({
      event: 'activity_illustration_failed',
      illustration_id: illustrationId,
      code,
      stage: providerError?.stage,
      provider_http_status: providerError?.httpStatus,
      provider_status: providerError?.providerStatus,
      provider_message: providerError?.providerMessage,
      duration_ms: Date.now() - started,
    }));
    return response({ error: code }, known ? error.status : 500);
  }
});
