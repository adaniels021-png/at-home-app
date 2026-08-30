import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const generatePath = 'supabase/functions/generate-activity-illustration/index.ts';
const previewPath = 'supabase/functions/get-activity-illustration-preview/index.ts';
const approvePath = 'supabase/functions/approve-activity-illustration/index.ts';
const authPath = 'supabase/functions/_shared/activity-illustration-auth.ts';
const promptPath = 'supabase/functions/_shared/activity-illustration-prompt.ts';
const storagePath = 'supabase/migrations/20260831121000_daily_adventures_activity_illustration_storage.sql';
const controlsPath = 'supabase/migrations/20260831120500_daily_adventures_activity_illustration_generation_controls.sql';

for (const file of [generatePath, previewPath, approvePath, authPath, promptPath, storagePath, controlsPath]) {
  assert.ok(exists(file), `missing ${file}`);
}

const generate = read(generatePath);
const auth = read(authPath);
const prompt = read(promptPath);
const storage = read(storagePath);
const controls = read(controlsPath);
const adminApi = read('lib/adminActivityIllustrations.ts');
const adminUi = read('components/admin/ActivityIllustrationAdminSection.tsx');
const edit = read('app/admin/activity-library/edit.tsx');
const aiGenerate = read('app/admin/activity-library/ai-generate.tsx');
const generic = read('supabase/functions/generate-ai-asset-image/index.ts');

assert.ok(auth.indexOf("auth.getUser") < auth.indexOf("rpc('is_app_admin')"));
assert.ok(auth.indexOf("rpc('is_app_admin')") < auth.indexOf("SUPABASE_SERVICE_ROLE_KEY"));
assert.match(generate, /ALLOWED_FIELDS/);
for (const forbidden of ['prompt', 'model', 'provider', 'bucket', 'path', 'admin']) {
  assert.ok(!generate.match(new RegExp(`['\"]${forbidden}['\"]\\s*,?\\s*(?:\\]|$)`)), `request contract may accept ${forbidden}`);
}
assert.match(generate, /from\('activity_library'\)/);
assert.match(generate, /reserve_activity_illustration_generation/);
assert.match(generate, /claim_activity_illustration_provider_call/);
assert.match(generate, /upsert: false/);
assert.match(prompt, /daily-adventure-illustration-v1/);
assert.match(prompt, /No text, letters, logos, trademarks, watermark, UI, Bun Bun/);
for (const privateTerm of ['child name', 'caregiver name', 'email', 'account id', 'assessment', 'subscription', 'saved history']) {
  assert.ok(!prompt.toLowerCase().includes(privateTerm), `prompt builder references ${privateTerm}`);
}
assert.match(storage, /activity-illustration-drafts[\s\S]*false/);
assert.match(storage, /activity-illustrations[\s\S]*true/);
assert.doesNotMatch(storage, /create policy/i);
assert.match(controls, /interval '60 seconds'/);
assert.match(controls, />= 10/);
assert.match(controls, />= 50/);
assert.match(controls, /artwork_may_be_outdated/);
assert.match(adminApi, /generate-activity-illustration/);
assert.match(adminUi, /Current approved illustration/);
assert.match(adminUi, /Replacement draft/);
assert.match(adminUi, /Artwork may be outdated/);
assert.match(edit, /ActivityIllustrationAdminSection/);
assert.doesNotMatch(aiGenerate, /generate-activity-illustration/);
assert.doesNotMatch(generic, /activity-illustration-drafts/);

// Mocked lifecycle/cost model: the provider is a counter, never a network call.
let providerCalls = 0;
const activity = { id: 'activity-1', title: 'Bubble Chase', status: 'approved', approved: null };
const jobs = new Map();
let candidate = null;
let version = 0;
const generateMock = (key, reason) => {
  if (jobs.has(key)) return jobs.get(key);
  if (candidate && ['generating', 'draft'].includes(candidate.status)) return candidate;
  if (reason === 'missing' && activity.approved) return { status: 'not_allowed' };
  candidate = { id: `art-${++version}`, version, status: 'generating', sourceHash: activity.title };
  jobs.set(key, candidate);
  providerCalls += 1;
  candidate.status = 'draft';
  return candidate;
};
const approveMock = () => {
  const prior = activity.approved;
  candidate.status = 'approved';
  activity.approved = candidate;
  candidate = null;
  if (prior) prior.status = 'superseded';
};
const rejectMock = () => { candidate.status = 'rejected'; candidate = null; };

generateMock('same-key', 'missing');
generateMock('same-key', 'missing');
assert.equal(providerCalls, 1, 'idempotent retry made a second provider call');
approveMock();
assert.equal(activity.approved.status, 'approved');
activity.title = 'Bubble Chase Updated';
assert.equal(activity.approved.sourceHash !== activity.title, true, 'outdated state not derived');
const originalApproved = activity.approved;
generateMock('replacement-1', 'regenerate');
assert.equal(activity.approved, originalApproved, 'regeneration replaced approved art early');
rejectMock();
assert.equal(activity.approved, originalApproved, 'rejection changed approved pointer');
generateMock('replacement-2', 'regenerate');
approveMock();
assert.equal(originalApproved.status, 'superseded');
assert.equal(activity.title, 'Bubble Chase Updated', 'illustration lifecycle changed activity content');
assert.equal(providerCalls, 3);

const c2 = read('supabase/migrations/20260831120000_daily_adventures_activity_illustration_foundation.sql');
assert.match(c2, /illustration_url text/);
const rlsCutover = 'supabase/migrations/20260830121000_daily_adventures_phase_a_rls_cutover.sql';
assert.ok(exists(rlsCutover), 'withheld RLS migration missing from repository');
assert.doesNotMatch(generate + previewPath + approvePath, /supabase migration up|functions deploy|eas build/i);

console.log('Daily Adventures Phase C.3 validator: PASS');
console.log('Mocked end-to-end lifecycle: PASS');
console.log('Cost/idempotency counter: PASS (3 explicit jobs, 3 provider calls; retry added 0)');
console.log('Real Gemini calls: 0');
