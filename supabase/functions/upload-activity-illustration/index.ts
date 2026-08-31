import {
  authorizeIllustrationAdmin,
  IllustrationHttpError,
  isMissingIllustrationStorage,
} from '../_shared/activity-illustration-auth.ts';
import {
  MAX_ILLUSTRATION_BYTES,
  SUPPORTED_PROVIDER_MIME_TYPES,
  validateActivityIllustration,
} from '../_shared/activity-illustration-image.ts';
import { sha256Hex } from '../_shared/activity-illustration-prompt.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let illustrationId: string | null = null;
  let uploadedPath: string | null = null;
  let uploadedNewObject = false;
  try {
    if (req.method !== 'POST') throw new IllustrationHttpError(405, 'METHOD_NOT_ALLOWED');
    const { userClient, serviceClient } = await authorizeIllustrationAdmin(req);
    const form = await req.formData();
    const keys = [...form.keys()];
    if (keys.some((key) => !['activity_id', 'idempotency_key', 'expected_approved_illustration_id', 'image'].includes(key))) {
      throw new IllustrationHttpError(400, 'UNKNOWN_REQUEST_FIELD');
    }
    const activityId = form.get('activity_id');
    const idempotencyKey = form.get('idempotency_key');
    const expectedApprovedId = form.get('expected_approved_illustration_id');
    const file = form.get('image');
    if (typeof activityId !== 'string' || !UUID.test(activityId)
      || typeof idempotencyKey !== 'string' || !UUID.test(idempotencyKey)
      || (expectedApprovedId !== null && (typeof expectedApprovedId !== 'string' || !UUID.test(expectedApprovedId)))
      || !(file instanceof File)) {
      throw new IllustrationHttpError(400, 'INVALID_REQUEST');
    }
    if (!SUPPORTED_PROVIDER_MIME_TYPES.includes(file.type as any)) {
      throw new IllustrationHttpError(400, 'IMAGE_FORMAT_UNSUPPORTED');
    }
    if (!file.size || file.size > MAX_ILLUSTRATION_BYTES) {
      throw new IllustrationHttpError(413, 'IMAGE_SIZE_INVALID');
    }
    let image;
    try {
      image = validateActivityIllustration({
        bytes: new Uint8Array(await file.arrayBuffer()),
        declaredMimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
      });
    } catch (error) {
      const code = String((error as Error)?.message || 'IMAGE_INVALID');
      const status = code === 'IMAGE_SIZE_INVALID' ? 413 : 400;
      throw new IllustrationHttpError(status, code);
    }
    const hash = await sha256Hex(image.bytes);
    const { data: reservations, error: reservationError } = await userClient.rpc(
      'reserve_activity_illustration_upload',
      {
        target_activity_id: activityId,
        target_idempotency_key: idempotencyKey,
        expected_current_approved_illustration_id: expectedApprovedId,
      },
    );
    if (reservationError) {
      const code = reservationError.message.includes('ILLUSTRATION_CANDIDATE_ACTIVE')
        ? 'ILLUSTRATION_CANDIDATE_ACTIVE'
        : reservationError.message.includes('APPROVED_ILLUSTRATION_CHANGED')
          ? 'APPROVAL_CONFLICT' : 'UPLOAD_NOT_ALLOWED';
      throw new IllustrationHttpError(409, code);
    }
    const job = Array.isArray(reservations) ? reservations[0] : reservations;
    if (!job || job.activity_id !== activityId) throw new Error('RESERVATION_IDENTITY_MISMATCH');
    illustrationId = job.illustration_id;
    const { data: current, error: currentError } = await serviceClient
      .from('activity_illustrations')
      .select('id,status,version,source_type,sha256,draft_storage_path')
      .eq('id', job.illustration_id).single();
    if (currentError || !current || current.source_type !== 'manual_upload') throw new Error('UPLOAD_JOB_NOT_FOUND');
    if (current.status === 'draft') {
      if (current.sha256 !== hash) throw new IllustrationHttpError(409, 'IDEMPOTENCY_CONTENT_CONFLICT');
      return json({ illustration_id: current.id, version: current.version, status: current.status, resumed: true });
    }
    if (current.status !== 'generating') throw new IllustrationHttpError(409, 'UPLOAD_NOT_ALLOWED');

    uploadedPath = `${activityId}/${current.id}/draft.${image.extension}`;
    const { error: uploadError } = await serviceClient.storage
      .from('activity-illustration-drafts')
      .upload(uploadedPath, image.bytes, { contentType: image.declaredMimeType, upsert: false });
    if (uploadError) {
      if (isMissingIllustrationStorage(uploadError)) {
        throw new IllustrationHttpError(503, 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE');
      }
      if (!String(uploadError.message).toLowerCase().includes('already exists')) throw new Error('DRAFT_UPLOAD_FAILED');
      const { data: existing, error: existingError } = await serviceClient.storage
        .from('activity-illustration-drafts').download(uploadedPath);
      if (existingError || !existing) throw new Error('DRAFT_ORPHAN_UNREADABLE');
      if (await sha256Hex(new Uint8Array(await existing.arrayBuffer())) !== hash) {
        throw new IllustrationHttpError(409, 'IDEMPOTENCY_CONTENT_CONFLICT');
      }
    } else {
      uploadedNewObject = true;
    }

    const { data: draft, error: transitionError } = await serviceClient.rpc(
      'mark_activity_illustration_manual_draft',
      {
        target_illustration_id: current.id,
        target_draft_storage_path: uploadedPath,
        target_mime_type: image.declaredMimeType,
        target_width: image.width,
        target_height: image.height,
        target_byte_size: image.bytes.length,
        target_sha256: hash,
      },
    );
    if (transitionError) {
      if (uploadedNewObject) await serviceClient.storage.from('activity-illustration-drafts').remove([uploadedPath]);
      throw new Error('DRAFT_TRANSITION_FAILED');
    }
    return json({ illustration_id: draft.id, version: draft.version, status: draft.status, source_type: draft.source_type });
  } catch (error) {
    const status = error instanceof IllustrationHttpError ? error.status : 500;
    const code = error instanceof IllustrationHttpError ? error.code : 'UPLOAD_FAILED';
    if (illustrationId) {
      try {
        const { serviceClient } = await authorizeIllustrationAdmin(req);
        await serviceClient.rpc('mark_activity_illustration_failed', {
          target_illustration_id: illustrationId,
          target_error_code: code.replace(/[^A-Z0-9_]/g, '_').slice(0, 80),
          target_error_message: 'Illustration upload could not be completed.',
        });
      } catch { /* original failure remains authoritative */ }
    }
    return json({ error: code }, status);
  }
});
