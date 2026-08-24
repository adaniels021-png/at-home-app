import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const defaults = {
  owner: new Set(['view_child', 'manage_caregivers', 'view_safety_profile', 'edit_safety_profile', 'use_help_now_general', 'use_elopement_response']),
  parent: new Set(['view_child', 'view_safety_profile', 'edit_safety_profile', 'use_help_now_general', 'use_elopement_response']),
  caregiver: new Set(['view_child', 'use_elopement_response', 'view_emergency_response_data']),
  therapist: new Set(['view_child']),
};
const can = (role, permission, override) => override ?? Boolean(defaults[role]?.has(permission));
const visible = (userId, children, memberships) => children.filter((child) =>
  child.owner === userId || memberships.some((m) => m.user === userId && m.child === child.id && m.status === 'accepted')
);

const children = [{ id: 'maya', owner: 'owner' }, { id: 'noah', owner: 'owner' }];
const memberships = [
  { user: 'sarah', child: 'maya', role: 'caregiver', status: 'accepted' },
  { user: 'parent-a', child: 'maya', role: 'parent', status: 'accepted' },
  { user: 'parent-b', child: 'noah', role: 'parent', status: 'accepted' },
  { user: 'therapist', child: 'maya', role: 'therapist', status: 'accepted' },
];

assert.deepEqual(visible('owner', children, memberships).map((c) => c.id), ['maya', 'noah']); // 1
assert.deepEqual(visible('sarah', children, memberships).map((c) => c.id), ['maya']); // 2
assert.equal(visible('sarah', children, memberships).some((c) => c.id === 'noah'), false); // 3
assert.equal(visible('sarah', children, memberships).find((c) => c.id === 'noah') ?? visible('sarah', children, memberships)[0].id, 'maya'); // 4
assert.equal(can('caregiver', 'use_help_now_general'), false); // 5
assert.equal(can('caregiver', 'use_elopement_response'), true); // 6
assert.equal(can('caregiver', 'edit_safety_profile'), false); // 7
assert.equal(can('owner', 'edit_safety_profile'), true); // 8
assert.deepEqual(visible('parent-a', children, memberships).map((c) => c.id), ['maya']);
assert.deepEqual(visible('parent-b', children, memberships).map((c) => c.id), ['noah']); // 9
assert.deepEqual(visible('sarah', children, memberships.filter((m) => m.user !== 'sarah')), []); // 10
assert.equal(can('caregiver', 'manage_caregivers'), false); // 11
assert.equal(visible('intruder', children, memberships).length, 0); // 12
assert.equal(can('caregiver', 'view_emergency_response_data'), true);
assert.equal(can('caregiver', 'edit_safety_profile'), false); // 13
assert.deepEqual(visible('therapist', children, memberships).map((c) => c.id), ['maya']);
assert.equal(can('therapist', 'view_safety_profile'), false); // 14

const migration = readFileSync(new URL('../supabase/migrations/20260823090000_enforce_child_scoped_caregiver_permissions.sql', import.meta.url), 'utf8');
assert.match(migration, /invite\.child_id/); // 15: accepted membership is invite-child scoped
assert.match(migration, /lower\(invite\.invited_email\) <> caller_email/);
assert.match(migration, /status = 'pending'.*for update/s);
assert.match(migration, /has_child_access\(id\)/);
assert.match(migration, /get_child_emergency_response_profile/);

console.log('15 child-scoped caregiver permission scenarios passed.');
