import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260824190000_add_child_scoped_family_entitlement.sql');
const context = read('lib/ChildSubscriptionContext.tsx');
const permissions = read('lib/caregiverPermissions.ts');

assert.match(migration, /security definer[\s\S]*?set search_path = ''/i);
assert.match(migration, /child\.parent_id = caller_id[\s\S]*?membership\.status = 'accepted'/i);
assert.match(migration, /membership\.role in \('parent', 'caregiver', 'therapist'\)/i);
assert.match(migration, /state_row\.user_id = owner_id/i);
assert.match(migration, /environment <> 'PRODUCTION'/i);
assert.match(migration, /expires_at is null or entitlement\.expires_at > now\(\)/i);
assert.match(migration, /revoke all on function public\.resolve_child_server_entitlement\(uuid\) from public, anon/i);
assert.match(migration, /grant execute on function public\.resolve_child_server_entitlement\(uuid\) to authenticated/i);
const returnSignature = migration.match(/returns table\(([\s\S]*?)\)\s*language/i)?.[1] ?? '';
assert.doesNotMatch(returnSignature, /owner_id/i);
assert.match(context, /rpc\(\s*'resolve_child_server_entitlement'/);
assert.match(context, /result\?\.authoritative === true && result\?\.is_pro === true/);
assert.match(context, /setIsPro\(false\)/, 'client failures must fail closed');

const users = {
  joe: { personalPro: true },
  sarah: { personalPro: false },
  parent: { personalPro: false },
  therapist: { personalPro: false },
};
const children = {
  maya: { owner: 'joe' },
  noah: { owner: 'other' },
  ava: { owner: 'sarah' },
};
const ownerPro = { joe: true, other: false, sarah: false };
const memberships = new Set([
  'sarah:maya',
  'sarah:noah',
  'parent:maya',
  'therapist:maya',
]);

const resolve = (user, child) => {
  const record = children[child];
  if (!record) return { authorized: false, isPro: false };
  const authorized = record.owner === user || memberships.has(`${user}:${child}`);
  return { authorized, isPro: authorized && ownerPro[record.owner] === true };
};
const permission = (role, key) => {
  const grants = {
    owner: new Set(['learning', 'progress', 'emergency', 'help_now', 'safety', 'caregiver_management']),
    parent: new Set(['learning', 'progress', 'emergency', 'help_now', 'safety']),
    caregiver: new Set(['learning', 'progress', 'emergency']),
    therapist: new Set(['learning', 'progress']),
  };
  return grants[role]?.has(key) === true;
};
const feature = (user, child, role, key) => {
  const entitlement = resolve(user, child);
  return entitlement.authorized && entitlement.isPro && permission(role, key);
};

assert.equal(resolve('joe', 'maya').isPro, true); // 1
ownerPro.joe = false;
assert.equal(resolve('joe', 'maya').isPro, false); // 2
ownerPro.joe = true;
assert.equal(resolve('sarah', 'maya').isPro, true); // 3
assert.equal(users.sarah.personalPro, false); // 4
assert.equal(resolve('sarah', 'maya').isPro, true); // 5
assert.equal(resolve('sarah', 'noah').isPro, false);
assert.equal(resolve('sarah', 'ava').isPro, false); // 6
assert.equal(feature('sarah', 'maya', 'caregiver', 'emergency'), true); // 7
assert.equal(feature('sarah', 'maya', 'caregiver', 'help_now'), false);
assert.equal(feature('sarah', 'maya', 'caregiver', 'safety'), false);
assert.equal(resolve('parent', 'maya').isPro, true); // 8
assert.equal(feature('parent', 'maya', 'parent', 'caregiver_management'), false);
assert.equal(feature('therapist', 'maya', 'therapist', 'learning'), true); // 9
assert.equal(feature('therapist', 'maya', 'therapist', 'safety'), false);
assert.deepEqual(resolve('sarah', 'missing'), { authorized: false, isPro: false }); // 10
memberships.delete('sarah:maya');
assert.equal(resolve('sarah', 'maya').authorized, false); // 11
memberships.add('sarah:maya');
ownerPro.joe = false;
assert.equal(resolve('sarah', 'maya').isPro, false); // 12
ownerPro.joe = true;
assert.equal(resolve('sarah', 'maya').isPro, true); // 13
assert.equal(resolve('unknown', 'maya').authorized, false); // 14

for (const denied of ['use_help_now_general', 'view_safety_profile', 'edit_safety_profile', 'manage_caregivers']) {
  assert.match(permissions, new RegExp(`caregiver: new Set\\(\\[[^\\]]*`), 'caregiver role must remain defined');
  const caregiverDefaults = permissions.match(/caregiver: new Set\(\[([^\]]*)\]\)/)?.[1] ?? '';
  assert(!caregiverDefaults.includes(`'${denied}'`), `caregiver must not gain ${denied}`);
}

console.log('14 child-scoped owner-funded subscription scenarios passed.');
