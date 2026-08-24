import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migrationName = '20260823090000_enforce_child_scoped_caregiver_permissions.sql';
const migration = read(`supabase/migrations/${migrationName}`);
const invite = read('app/settings/invite-caregiver.tsx');
const accept = read('app/settings/accept-caregiver-invite.tsx');
const access = read('app/settings/caregiver-access/[id].tsx');
const safetyAccess = read('lib/safety/safetyAccess.ts');
const safetyProfile = read('lib/safety/profileData.ts');

const functions = [
  'child_access_role',
  'has_child_access',
  'has_child_permission',
  'can_access_child_safety',
  'can_edit_child_safety',
  'can_use_child_safety_mode',
  'can_participate_child_safety_incident',
  'get_child_emergency_response_profile',
  'create_caregiver_invite',
  'accept_caregiver_invite',
];
for (const name of functions) {
  assert.match(
    migration,
    new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?security definer set search_path = ''`, 'i'),
    `${name} must be SECURITY DEFINER with an empty search_path`,
  );
  assert.match(migration, new RegExp(`revoke all on function public\\.${name}\\(`), `${name} must revoke PUBLIC execution`);
  assert.match(migration, new RegExp(`grant execute on function public\\.${name}\\(`), `${name} must grant authenticated execution`);
}

for (const policy of [
  'Users read authorized children only',
  'Owners create their children',
  'Owners update their children',
  'Owners delete their children',
  'Members read own child memberships',
  'Owners manage child memberships',
  'Owners read child invites',
  'Owners cancel child invites',
  'Owners manage child caregiver permission overrides',
  'Caregivers view own permission overrides',
]) assert.match(migration, new RegExp(`create policy "${policy}"`), `missing policy: ${policy}`);

const sqlPermissions = new Set(
  [...migration.matchAll(/'((?:view|use|edit)_[a-z_]+)'/g)].map((match) => match[1])
    .filter((permission) => migration.slice(0, migration.indexOf('create or replace function public.child_access_role')).includes(`'${permission}'`)),
);
const clientPermissions = new Set([...access.matchAll(/permission: '([a-z_]+)'/g)].map((match) => match[1]));
assert.deepEqual([...clientPermissions].sort(), [...sqlPermissions].sort(), 'client override keys must match the SQL constraint');

assert.match(invite, /rpc\(\s*'create_caregiver_invite',\s*\{[\s\S]*?target_child_id[\s\S]*?target_email[\s\S]*?target_role/);
assert.match(accept, /rpc(?:<[^>]+>)?\(\s*'accept_caregiver_invite',\s*\{\s*p_invite_code:/);
for (const rpc of ['can_access_child_safety', 'has_child_permission', 'can_edit_child_safety', 'can_use_child_safety_mode', 'can_participate_child_safety_incident']) {
  assert.match(safetyAccess, new RegExp(`'${rpc}'`), `client must call ${rpc}`);
}
assert.match(safetyProfile, /'get_child_emergency_response_profile'/);

assert.match(migration, /extensions\.gen_random_bytes\(6\)/, 'invite codes must use server-side cryptographic randomness');
assert.match(migration, /caregiver_invites_pending_code_unique/);
assert.match(migration, /exception when unique_violation/);
assert.match(migration, /expires_at > now\(\)/);
assert.match(migration, /lower\(invite\.invited_email\) <> caller_email/);
assert.match(migration, /status = 'pending'[\s\S]*?for update/);
assert.match(migration, /is distinct from 'owner'/, 'owner authorization must be NULL-safe');
assert.match(migration, /drop function if exists public\.accept_caregiver_invite\(text\)/, 'legacy table-returning invite RPC must be dropped before scalar replacement');
assert.doesNotMatch(invite, /Math\.random/);

assert.match(migration, /get_child_emergency_response_profile[\s\S]*?jsonb_build_object/);
assert.doesNotMatch(migration.match(/get_child_emergency_response_profile[\s\S]*?\$\$;/)?.[0] ?? '', /additional_notes/);
assert.match(migration, /can_edit_child_safety[\s\S]*?'edit_safety_profile'/);
assert.match(migration, /revoke all on table public\.child_caregiver_permission_overrides from public, anon/);

const duplicates = readdirSync(new URL('../supabase/migrations', import.meta.url))
  .filter((name) => name.includes('enforce_child_scoped_caregiver_permissions'));
assert.deepEqual(duplicates, [migrationName], 'caregiver authorization migration must not be duplicated');

console.log(`Caregiver migration contract validated: ${functions.length} functions, 10 policies, ${clientPermissions.size} override keys.`);
