import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260831122000_daily_adventures_native_illustration_approval.sql',
  'utf8',
);
const approvalEdge = fs.readFileSync(
  'supabase/functions/approve-activity-illustration/index.ts',
  'utf8',
);

const extensionForMime = (mime) => ({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
})[mime] ?? null;

const validPath = ({ activityId, version, mime, path }) => {
  const extension = extensionForMime(mime);
  if (!extension) return false;
  return new RegExp(`^${activityId}/v${version}-[0-9a-f]{8,64}[.]${extension}$`).test(path);
};

const activityId = '11111111-1111-4111-8111-111111111111';
const pathFor = (extension) => `${activityId}/v5-21c78640624ea4a6.${extension}`;
for (const [mime, accepted] of [
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]) {
  for (const extension of ['png', 'jpg', 'webp']) {
    assert.equal(
      validPath({ activityId, version: 5, mime, path: pathFor(extension) }),
      extension === accepted,
      `${mime} incorrectly handled .${extension}`,
    );
  }
}
assert.equal(validPath({ activityId, version: 5, mime: 'image/gif', path: pathFor('gif') }), false);
assert.equal(validPath({ activityId, version: 5, mime: null, path: pathFor('png') }), false);
assert.equal(validPath({ activityId, version: 5, mime: 'image/jpeg', path: pathFor('jpeg') }), false);

const pointerMatches = (actual, expected) => actual === expected;
const uuidA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const uuidB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
assert.equal(pointerMatches(null, null), true, 'first approval NULL/NULL must pass');
assert.equal(pointerMatches(uuidA, null), false, 'first approval race must conflict');
assert.equal(pointerMatches(uuidA, uuidA), true, 'matching replacement pointer must pass');
assert.equal(pointerMatches(uuidB, uuidA), false, 'replacement race must conflict');
assert.equal(pointerMatches(null, uuidA), false, 'missing replacement pointer must conflict');

const approveModel = ({ activity, candidate, expectedPointer, approvedPath }) => {
  const nextActivity = structuredClone(activity);
  const nextCandidate = structuredClone(candidate);
  const previous = nextActivity.approved ? structuredClone(nextActivity.approved) : null;
  if (nextCandidate.activityId !== nextActivity.id) throw new Error('ACTIVITY_MISMATCH');
  if (nextCandidate.status !== 'draft') throw new Error('ILLUSTRATION_NOT_APPROVABLE');
  if (nextCandidate.sourceHash !== nextActivity.sourceHash) throw new Error('ILLUSTRATION_SOURCE_CONTENT_CHANGED');
  if (!pointerMatches(nextActivity.approved?.id ?? null, expectedPointer)) throw new Error('APPROVED_ILLUSTRATION_CHANGED');
  if (!validPath({ activityId: nextActivity.id, version: nextCandidate.version, mime: nextCandidate.mime, path: approvedPath })) {
    throw new Error('INVALID_APPROVED_STORAGE_PATH');
  }
  if (previous) {
    if (previous.status !== 'approved') throw new Error('CURRENT_APPROVED_ILLUSTRATION_INVALID');
    previous.status = 'superseded';
    previous.supersededBy = nextCandidate.id;
  }
  nextCandidate.status = 'approved';
  nextActivity.approved = nextCandidate;
  return { activity: nextActivity, candidate: nextCandidate, previous };
};

const baseActivity = { id: activityId, sourceHash: 'source-hash', approved: null };
const baseCandidate = { id: uuidB, activityId, version: 5, status: 'draft', sourceHash: 'source-hash', mime: 'image/png' };
const first = approveModel({ activity: baseActivity, candidate: baseCandidate, expectedPointer: null, approvedPath: pathFor('png') });
assert.equal(first.activity.approved.id, uuidB, 'first approval must atomically set pointer');
assert.equal(first.candidate.status, 'approved');

for (const [mutation, code] of [
  [(candidate) => { candidate.sourceHash = 'stale'; }, 'ILLUSTRATION_SOURCE_CONTENT_CHANGED'],
  [(candidate) => { candidate.status = 'rejected'; }, 'ILLUSTRATION_NOT_APPROVABLE'],
  [(candidate) => { candidate.activityId = uuidA; }, 'ACTIVITY_MISMATCH'],
]) {
  const activity = structuredClone(baseActivity);
  const candidate = structuredClone(baseCandidate);
  mutation(candidate);
  const beforeCallCandidate = structuredClone(candidate);
  assert.throws(
    () => approveModel({ activity, candidate, expectedPointer: null, approvedPath: pathFor('png') }),
    (error) => error instanceof Error && error.message === code,
  );
  assert.deepEqual(activity, baseActivity, `${code} altered the original pointer`);
  assert.deepEqual(candidate, beforeCallCandidate, `${code} altered candidate during failed validation`);
}

const prior = { id: uuidA, status: 'approved', supersededBy: null };
const replacementActivity = { ...baseActivity, approved: prior };
const replacement = approveModel({
  activity: replacementActivity,
  candidate: baseCandidate,
  expectedPointer: uuidA,
  approvedPath: pathFor('png'),
});
assert.equal(replacement.activity.approved.id, uuidB, 'replacement must atomically swap pointer');
assert.deepEqual(replacement.previous, { id: uuidA, status: 'superseded', supersededBy: uuidB });
assert.equal(prior.status, 'approved', 'model must not mutate input before successful commit result');

// Static checks ensure the executable SQL retains the complete atomic lifecycle.
assert.match(migration, /not public\.is_app_admin\(\)/i);
assert.match(migration, /candidate\.status <> 'draft'/i);
assert.match(migration, /candidate\.activity_id/i);
assert.match(migration, /activity_illustration_source_content_hash\(activity\.id\)/i);
assert.match(migration, /current_source_content_hash is distinct from candidate\.source_content_hash/i);
assert.match(migration, /ILLUSTRATION_SOURCE_CONTENT_CHANGED/i);
assert.match(migration, /activity\.approved_illustration_id is distinct from expected_current_approved_illustration_id/i);
assert.doesNotMatch(migration, /expected_current_approved_illustration_id is not null/i);
assert.match(migration, /when 'image\/png' then 'png'/i);
assert.match(migration, /when 'image\/jpeg' then 'jpg'/i);
assert.match(migration, /when 'image\/webp' then 'webp'/i);
assert.match(migration, /else null/i);
assert.match(migration, /previous\.activity_id = activity\.id/i);
assert.match(migration, /previous\.status = 'approved'/i);
assert.match(migration, /set status = 'superseded', superseded_by = candidate\.id/i);
assert.match(migration, /set status = 'approved'/i);
assert.match(migration, /set approved_illustration_id = candidate\.id/i);
assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
assert.match(migration, /revoke all on function public\.approve_activity_illustration[\s\S]*from public, anon/i);
assert.match(migration, /grant execute on function public\.approve_activity_illustration[\s\S]*to authenticated/i);

// Failed SQL validation is transactional, so pointer/status changes below it roll back.
assert.ok(
  migration.indexOf('INVALID_APPROVED_STORAGE_PATH') < migration.indexOf("set status = 'superseded'"),
  'path validation must precede lifecycle mutation',
);
assert.ok(
  migration.indexOf('INVALID_APPROVED_PUBLIC_URL') < migration.indexOf("set status = 'superseded'"),
  'URL validation must precede lifecycle mutation',
);

// The canonical hash function remains the source for the approval-time staleness guard.
const foundation = fs.readFileSync(
  'supabase/migrations/20260831120000_daily_adventures_activity_illustration_foundation.sql',
  'utf8',
);
assert.match(foundation, /activity_illustration_source_content_hash/i);

// Deterministic approved objects are reusable only after full SHA-256 verification.
assert.match(approvalEdge, /deterministic orphan/i);
assert.match(approvalEdge, /existingHash !== hash/);
assert.match(approvalEdge, /APPROVED_PATH_INTEGRITY_CONFLICT/);
assert.match(approvalEdge, /\.\$\{image\.extension\}/);

console.log('Daily Adventures native approval validator: PASS');
console.log('PNG/JPEG/WebP MIME-path matrix: PASS');
console.log('NULL-aware first/replacement concurrency model: PASS');
console.log('Atomic approval/supersede and deterministic orphan reuse contracts: PASS');
console.log('Real Gemini calls: 0');
