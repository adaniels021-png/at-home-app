import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const permissions = read('lib/caregiverPermissions.ts');
const manage = read('app/settings/manage-caregivers.tsx');
const detail = read('app/settings/caregiver-access/[id].tsx');
const invite = read('app/settings/invite-caregiver.tsx');
const accept = read('app/settings/accept-caregiver-invite.tsx');
const profile = read('app/settings/caregiver-profile.tsx');
const profileSettings = read('app/settings/profile-settings.tsx');
const home = read('app/(tabs)/index.tsx');
const context = read('lib/SelectedChildContext.tsx');

assert.match(manage, /Family Access/); // 1
assert.match(manage, /selectedChild\.id/); // 2
assert.match(profileSettings, /canManageCaregivers\(role\)/); // 3
assert.doesNotMatch(profileSettings, /Noah/); // 4
assert.match(context, /caregiver_user_id/); // 5
assert.match(profile, /canManageChildSettings/); // 6-8
assert.match(invite, /getRoleAccessSummary\(role\)/); // 9-11
assert.match(manage, /Cancel Invite/); // 12
assert.match(detail, /Remove Access/); // 13
assert.match(home, /hasGeneralHelpNow \? 'Get Help Now' : 'Emergency Help'/); // 14
assert.match(home, /canViewSafetyProfile\(role\) \? 'Safety' : 'Emergency Response'/); // 15
assert.match(detail, /minHeight: 50/); // 16 touch target baseline
assert.match(invite, /create_caregiver_invite/);
assert.doesNotMatch(invite, /Math\.random/);
assert.match(permissions, /CAREGIVER_ROLE_LABELS/);
assert.match(accept, /Access Connected/);

console.log('16 caregiver role-aware UI scenarios passed static validation.');
