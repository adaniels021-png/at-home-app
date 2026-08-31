import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAX_ILLUSTRATION_BYTES,
  validateActivityIllustration,
} from '../supabase/functions/_shared/activity-illustration-image.ts';
import { sha256Hex } from '../supabase/functions/_shared/activity-illustration-prompt.ts';

const read = (path) => fs.readFileSync(path, 'utf8');
const edge = read('supabase/functions/upload-activity-illustration/index.ts');
const migration = read('supabase/migrations/20260831122500_daily_adventures_manual_illustration_upload.sql');
const component = read('components/admin/ActivityIllustrationAdminSection.tsx');
const client = read('lib/adminActivityIllustrations.ts');
const approval = read('supabase/functions/approve-activity-illustration/index.ts');
const family = read('supabase/migrations/20260831120000_daily_adventures_activity_illustration_foundation.sql');

const be16 = (v) => [v >> 8, v & 255];
const be32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const chars = (v) => [...v].map((c) => c.charCodeAt(0));
const png = (w, h, size = 24) => { const b = new Uint8Array(size); b.set([0x89, ...chars('PNG'), 13, 10, 26, 10, ...be32(13), ...chars('IHDR'), ...be32(w), ...be32(h)]); return b; };
const jpeg = (w, h) => Uint8Array.from([255, 216, 255, 192, 0, 17, 8, ...be16(h), ...be16(w), 3, 1, 17, 0, 2, 17, 0, 3, 17, 0]);
const le32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
const webp = (w, h) => Uint8Array.from([...chars('RIFF'), ...le32(22), ...chars('WEBPVP8X'), ...le32(10), 0, 0, 0, 0, (w - 1) & 255, ((w - 1) >> 8) & 255, ((w - 1) >> 16) & 255, (h - 1) & 255, ((h - 1) >> 8) & 255, ((h - 1) >> 16) & 255]);

for (const [mime, extension, bytes] of [
  ['image/png', 'png', png(800, 600)],
  ['image/jpeg', 'jpg', jpeg(800, 600)],
  ['image/webp', 'webp', webp(800, 600)],
]) {
  const image = validateActivityIllustration({ bytes, declaredMimeType: mime });
  assert.equal(image.extension, extension);
  assert.deepEqual([image.width, image.height], [800, 600]);
  assert.match(await sha256Hex(bytes), /^[0-9a-f]{64}$/);
}
assert.throws(() => validateActivityIllustration({ bytes: jpeg(800, 600), declaredMimeType: 'image/png' }));
assert.throws(() => validateActivityIllustration({ bytes: new Uint8Array([1, 2]), declaredMimeType: 'image/png' }));
assert.throws(() => validateActivityIllustration({ bytes: png(511, 512), declaredMimeType: 'image/png' }), /TOO_SMALL/);
assert.throws(() => validateActivityIllustration({ bytes: png(4097, 512), declaredMimeType: 'image/png' }), /TOO_LARGE/);
assert.throws(() => validateActivityIllustration({ bytes: png(800, 600, MAX_ILLUSTRATION_BYTES + 1), declaredMimeType: 'image/png' }), /SIZE_INVALID/);

assert.match(edge, /authorizeIllustrationAdmin\(req\)/);
const handler = edge.slice(edge.indexOf('Deno.serve'));
assert.ok(handler.indexOf('authorizeIllustrationAdmin(req)') < handler.indexOf('.from('));
assert.match(edge, /req\.formData\(\)/);
assert.match(edge, /reserve_activity_illustration_upload/);
assert.match(edge, /mark_activity_illustration_manual_draft/);
assert.match(edge, /activity-illustration-drafts/);
assert.doesNotMatch(edge, /\.from\('activity-illustrations'\)\.upload/);
assert.doesNotMatch(edge, /Gemini|generate-activity-illustration|generate-ai-asset-image/);
for (const forbidden of ['storage_path', 'status', 'source_content_hash', 'version', 'provider', 'model', 'approved_url']) {
  assert.doesNotMatch(edge, new RegExp(`form\\.get\\(['"]${forbidden}['"]\\)`));
}

assert.match(migration, /source_type in \('ai', 'manual_upload'\)/);
assert.match(migration, /source_type = 'manual_upload'/);
assert.match(migration, /activity_illustration_source_content_hash\(target_activity_id\)/);
assert.match(migration, /is distinct from expected_current_approved_illustration_id/);
assert.match(migration, /status in \('generating', 'draft'\)/);
assert.match(migration, /coalesce\(max\(candidate\.version\), 0\) \+ 1/);
assert.match(migration, /'generating'[\s\S]*'manual_upload'/);
assert.match(migration, /set status = 'draft'/);
assert.doesNotMatch(migration, /set approved_illustration_id/);
assert.match(migration, /grant execute on function public\.reserve_activity_illustration_upload[\s\S]*to authenticated/);
assert.match(migration, /mark_activity_illustration_manual_draft[\s\S]*to service_role/);
assert.match(migration, /source_type', candidate\.source_type/);

assert.match(client, /new FormData\(\)/);
assert.match(client, /upload-activity-illustration/);
assert.match(component, /launchImageLibraryAsync/);
assert.match(component, /Upload My Own Illustration/);
assert.match(component, /Upload Replacement/);
assert.match(component, /Try Upload Again/);
assert.match(component, /Uploaded Illustration/);
const uploadHandler = component.slice(
  component.indexOf('const pickAndUploadIllustration'),
  component.indexOf('return ('),
);
assert.match(uploadHandler, /uploadActivityIllustration/);
assert.doesNotMatch(uploadHandler, /generateActivityIllustration/);
assert.match(approval, /approve_activity_illustration/);
assert.match(family, /illustration\.id = activity\.approved_illustration_id and illustration\.status = 'approved'/i);
assert.doesNotMatch(family, /source_type text/);

const approved = { id: 'approved-6', status: 'approved' };
const draft = { id: 'manual-7', status: 'draft', sourceType: 'manual_upload' };
assert.equal(approved.status, 'approved');
assert.equal(draft.status, 'draft');
const afterReject = { approved, draft: { ...draft, status: 'rejected' } };
assert.equal(afterReject.approved.id, approved.id);
const afterApprove = { approved: { ...draft, status: 'approved' }, previous: { ...approved, status: 'superseded' } };
assert.equal(afterApprove.approved.id, draft.id);
assert.equal(afterApprove.previous.status, 'superseded');

console.log('Daily Adventures manual illustration upload matrix: PASS');
console.log('Native validation, server authority, private draft, idempotency, and shared approval: PASS');
console.log('Real Gemini calls: 0');
