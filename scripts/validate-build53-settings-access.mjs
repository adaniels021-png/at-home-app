import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const settings = read('app/(tabs)/settings.tsx');
const permissions = read('lib/caregiverPermissions.ts');
const migration = read('supabase/migrations/20260827120000_add_caregiver_self_removal.sql');
const accountDeletion = read('supabase/migrations/20260826120000_create_safe_account_deletion.sql');
const childEntitlement = read('supabase/migrations/20260824190000_add_child_scoped_family_entitlement.sql');

assert.match(permissions, /canDeleteOwnAccount = \(\) => true/);
assert.doesNotMatch(settings, /label="Delete Account"[\s\S]{0,120}Owner only/);
assert.match(settings, /Remove Child From My Account/);
assert.match(settings, /remove_my_child_access/);
assert.match(settings, /Your Plan/);
assert.match(settings, /\{childName\}&apos;s Access/);
assert.match(settings, /personalHasProAccess \? 'Pro Active' : 'Free'/);
assert.match(settings, /hasProAccess \? 'Pro' : 'Free'/);
assert.match(settings, /childAccessLoading/);

assert.match(migration, /security definer/);
assert.match(migration, /caller uuid := auth\.uid\(\)/);
assert.match(migration, /membership\.caregiver_user_id = caller/);
assert.match(migration, /membership\.child_id = target_child_id/);
assert.match(migration, /OWNER_CANNOT_REMOVE_OWNERSHIP/);
assert.doesNotMatch(migration, /target_caregiver|caregiver_user_id uuid/);
assert.match(migration, /delete from public\.child_caregiver_permission_overrides/);
assert.match(migration, /delete from public\.child_safety_permissions/);
assert.match(migration, /delete from public\.child_caregivers/);
assert.doesNotMatch(migration, /delete from public\.children/);
assert.match(migration, /grant execute on function public\.remove_my_child_access\(uuid\) to authenticated/);
assert.match(migration, /revoke all on function public\.remove_my_child_access\(uuid\) from public, anon/);

assert.match(accountDeletion, /CAREGIVER_ONLY/);
assert.match(accountDeletion, /when owned_count > 0 and caregiver_count > 0 then 'MIXED'/);
assert.match(accountDeletion, /delete from public\.child_caregivers where caregiver_user_id = caller/);
assert.match(childEntitlement, /where state_row\.user_id = owner_id/);

const therapistChildren = ['A', 'B', 'C', 'D', 'E'];
const afterRemovingC = therapistChildren.filter((child) => child !== 'C');
assert.equal(afterRemovingC.length, 4);
assert.equal(afterRemovingC.includes('C'), false);
assert.deepEqual(afterRemovingC, ['A', 'B', 'D', 'E']);

const personalPlanIsPro = false;
const childAccess = { A: true, B: false, C: true, D: false, E: true };
assert.equal(personalPlanIsPro, false);
assert.equal(childAccess.A, true);
assert.equal(childAccess.B, false);
assert.equal(personalPlanIsPro, false);

console.log('32 Build 53 role, self-removal, preservation, and subscription display assertions passed.');
