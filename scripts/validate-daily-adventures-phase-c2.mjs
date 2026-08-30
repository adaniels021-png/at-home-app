import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(
  root,
  'supabase/migrations/20260831120000_daily_adventures_activity_illustration_foundation.sql'
);
const migration = fs.readFileSync(migrationPath, 'utf8');
const api = fs.readFileSync(path.join(root, 'lib/dailyAdventuresApi.ts'), 'utf8');
const cutoverPath = path.join(
  root,
  'supabase/migrations/20260830121000_daily_adventures_phase_a_rls_cutover.sql'
);

const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbid = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

requireMatch(migration, /create table public\.activity_illustrations/i, 'activity_illustrations table is missing');
for (const status of ['generating', 'draft', 'approved', 'rejected', 'failed', 'superseded']) {
  requireMatch(migration, new RegExp(`'${status}'`), `status ${status} is missing`);
}
requireMatch(migration, /generation_reason in \('missing', 'regenerate'\)/i, 'generation reason constraint is missing');
requireMatch(migration, /unique \(activity_id, version\)/i, 'activity version uniqueness is missing');
requireMatch(migration, /idempotency_key uuid not null unique/i, 'idempotency uniqueness is missing');
requireMatch(migration, /where status in \('generating', 'draft'\)/i, 'active candidate uniqueness is missing');
requireMatch(migration, /add column approved_illustration_id uuid/i, 'approved illustration pointer is missing');
requireMatch(migration, /enforce_activity_approved_illustration/i, 'cross-activity pointer guard is missing');
requireMatch(migration, /activity_illustration_source_content_hash/i, 'source content hash helper is missing');
requireMatch(migration, /extensions\.digest[\s\S]*?'sha256'/i, 'SHA-256 hashing is missing');

for (const rpc of [
  'reserve_activity_illustration_generation',
  'approve_activity_illustration',
  'reject_activity_illustration',
]) {
  requireMatch(migration, new RegExp(`function public\\.${rpc}`), `${rpc} is missing`);
}
requireMatch(migration, /caller_id uuid := auth\.uid\(\)/i, 'mutation RPCs do not derive caller identity');
requireMatch(migration, /not public\.is_app_admin\(\)/i, 'authoritative admin check is missing');
requireMatch(migration, /security definer[\s\S]*?set search_path = ''/i, 'safe SECURITY DEFINER search_path is missing');
requireMatch(migration, /revoke all on function public\.reserve_activity_illustration_generation[\s\S]*?from public, anon/i, 'reservation revoke is missing');
requireMatch(migration, /revoke all on table public\.activity_illustrations from public, anon, authenticated/i, 'table privilege revoke is missing');

for (const rpc of [
  'get_my_daily_adventures',
  'search_my_activity_library',
  'get_my_activity_detail',
  'get_my_surprise_activity',
]) {
  requireMatch(migration, new RegExp(`function public\\.${rpc}[\\s\\S]*?illustration_url text`), `${rpc} lacks illustration_url`);
}
requireMatch(migration, /illustration\.id = activity\.approved_illustration_id and illustration\.status = 'approved'/i, 'family RPCs do not enforce current approved-only artwork');
requireMatch(migration, /get_my_saved_activity_snapshot[\s\S]*?illustration\.approved_public_url[\s\S]*?saved\.library_activity_id/i, 'Saved does not resolve current stable-library artwork');
requireMatch(api, /illustration_url: string \| null/, 'client nullable illustration type seam is missing');
requireMatch(api, /page_size: input\.limit \|\| 5/, 'Explore client no longer requests five at a time');

forbid(migration, /bun\s*bun/i, 'Bun Bun must not appear in the illustration foundation');
forbid(migration, /total_(count|library)|library_total/i, 'family library totals must not be exposed');
forbid(migration, /storage\.buckets|insert into storage\.|gemini|generatecontent/i, 'Storage/provider implementation started in C.2');
forbid(migration, /service_role_key|supabase_service_role/i, 'service-role credentials must not appear in SQL');

if (!fs.existsSync(cutoverPath)) failures.push('withheld Phase A RLS cutover migration is missing');

if (failures.length) {
  console.error(`Daily Adventures Phase C.2 validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Daily Adventures Phase C.2 static security contract: PASS');
