import {
  authorizeIllustrationAdmin,
  IllustrationHttpError,
  isMissingIllustrationStorage,
} from '../_shared/activity-illustration-auth.ts';

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
    const { serviceClient } = await authorizeIllustrationAdmin(req);
    const body = await req.json();
    if (!body || Object.keys(body).length !== 1 || !UUID.test(body.illustration_id)) throw new IllustrationHttpError(400, 'INVALID_REQUEST');
    const { data: candidate, error } = await serviceClient
      .from('activity_illustrations')
      .select('id,activity_id,status,draft_storage_path')
      .eq('id', body.illustration_id)
      .single();
    const expectedPath = candidate ? `${candidate.activity_id}/${candidate.id}/draft.webp` : '';
    if (error || !candidate || candidate.status !== 'draft' || candidate.draft_storage_path !== expectedPath) throw new IllustrationHttpError(404, 'PREVIEW_NOT_AVAILABLE');
    const expiresIn = 300;
    const { data, error: signError } = await serviceClient.storage
      .from('activity-illustration-drafts')
      .createSignedUrl(expectedPath, expiresIn);
    if (signError || !data?.signedUrl) {
      if (signError && isMissingIllustrationStorage(signError)) {
        throw new IllustrationHttpError(503, 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE');
      }
      throw new Error('PREVIEW_SIGNING_FAILED');
    }
    return json({ illustration_id: candidate.id, signed_url: data.signedUrl, expires_in: expiresIn });
  } catch (error) {
    const status = error instanceof IllustrationHttpError ? error.status : 500;
    const code = error instanceof IllustrationHttpError ? error.code : 'PREVIEW_FAILED';
    return json({ error: code }, status);
  }
});
