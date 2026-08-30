import {
  authorizeIllustrationAdmin,
  IllustrationHttpError,
  isMissingIllustrationStorage,
} from '../_shared/activity-illustration-auth.ts';
import {
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
  try {
    if (req.method !== 'POST') throw new IllustrationHttpError(405, 'METHOD_NOT_ALLOWED');
    const { userClient, serviceClient } = await authorizeIllustrationAdmin(req);
    const body = await req.json();
    const keys = Object.keys(body || {});
    if (keys.some((key) => !['illustration_id', 'expected_approved_illustration_id'].includes(key)) || !UUID.test(body?.illustration_id) || (body.expected_approved_illustration_id != null && !UUID.test(body.expected_approved_illustration_id))) throw new IllustrationHttpError(400, 'INVALID_REQUEST');
    const { data: candidate, error } = await serviceClient
      .from('activity_illustrations')
      .select('id,activity_id,version,status,draft_storage_path,mime_type,width,height,byte_size,sha256')
      .eq('id', body.illustration_id)
      .single();
    const declaredMimeType = candidate?.mime_type;
    if (!SUPPORTED_PROVIDER_MIME_TYPES.includes(declaredMimeType as any)) {
      throw new IllustrationHttpError(409, 'ILLUSTRATION_NOT_APPROVABLE');
    }
    const extension = declaredMimeType === 'image/png' ? 'png' : declaredMimeType === 'image/jpeg' ? 'jpg' : 'webp';
    const expectedDraftPath = candidate ? `${candidate.activity_id}/${candidate.id}/draft.${extension}` : '';
    if (error || !candidate || candidate.status !== 'draft' || candidate.draft_storage_path !== expectedDraftPath) throw new IllustrationHttpError(409, 'ILLUSTRATION_NOT_APPROVABLE');
    const { data: blob, error: downloadError } = await serviceClient.storage
      .from('activity-illustration-drafts').download(expectedDraftPath);
    if (downloadError || !blob) {
      if (downloadError && isMissingIllustrationStorage(downloadError)) {
        throw new IllustrationHttpError(503, 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE');
      }
      throw new Error('DRAFT_DOWNLOAD_FAILED');
    }
    const image = validateActivityIllustration({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      declaredMimeType: declaredMimeType as 'image/png' | 'image/jpeg' | 'image/webp',
    });
    const hash = await sha256Hex(image.bytes);
    if (
      hash !== candidate.sha256 ||
      image.declaredMimeType !== candidate.mime_type ||
      image.width !== candidate.width ||
      image.height !== candidate.height ||
      image.bytes.length !== candidate.byte_size
    ) throw new Error('DRAFT_INTEGRITY_FAILED');
    const approvedPath = `${candidate.activity_id}/v${candidate.version}-${hash.slice(0, 16)}.${image.extension}`;
    const { error: uploadError } = await serviceClient.storage
      .from('activity-illustrations')
      .upload(approvedPath, image.bytes, {
        contentType: image.declaredMimeType,
        cacheControl: '31536000, immutable',
        upsert: false,
      });
    if (uploadError) {
      if (isMissingIllustrationStorage(uploadError)) {
        throw new IllustrationHttpError(503, 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE');
      }
      if (!String(uploadError.message).toLowerCase().includes('already exists')) {
        throw new Error('APPROVED_UPLOAD_FAILED');
      }
      // A deterministic orphan from a prior interrupted approval is reusable
      // only when its full content hash matches this reviewed draft.
      const { data: existingBlob, error: existingError } = await serviceClient.storage
        .from('activity-illustrations').download(approvedPath);
      if (existingError || !existingBlob) throw new Error('APPROVED_ORPHAN_UNREADABLE');
      const existingHash = await sha256Hex(new Uint8Array(await existingBlob.arrayBuffer()));
      if (existingHash !== hash) throw new Error('APPROVED_PATH_INTEGRITY_CONFLICT');
    }
    const { data: publicData } = serviceClient.storage.from('activity-illustrations').getPublicUrl(approvedPath);
    const { data: approved, error: approvalError } = await userClient.rpc(
      'approve_activity_illustration',
      {
        target_illustration_id: candidate.id,
        target_approved_storage_path: approvedPath,
        target_approved_public_url: publicData.publicUrl,
        expected_current_approved_illustration_id: body.expected_approved_illustration_id ?? null,
      },
    );
    if (approvalError) throw new IllustrationHttpError(409, 'APPROVAL_CONFLICT');
    return json({ illustration_id: approved.id, activity_id: approved.activity_id, status: approved.status, approved_public_url: approved.approved_public_url });
  } catch (error) {
    const status = error instanceof IllustrationHttpError ? error.status : 500;
    const code = error instanceof IllustrationHttpError ? error.code : String((error as Error)?.message || 'APPROVAL_FAILED').replace(/[^A-Z0-9_]/g, '_').slice(0, 80);
    return json({ error: code }, status);
  }
});
