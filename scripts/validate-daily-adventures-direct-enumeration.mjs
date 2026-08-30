import { contains, pass, read } from './daily-adventures-validator-utils.mjs';

const foundation = read('supabase/migrations/20260830120000_daily_adventures_phase_a_foundation.sql');
const cutover = read('supabase/migrations/20260830121000_daily_adventures_phase_a_rls_cutover.sql');
const familyScreen = read('app/(tabs)/activities.tsx');
const savedScreen = read('app/(tabs)/saved.tsx');

contains(foundation, /if not public\.daily_adventures_child_is_pro\(target_child_id\) then\s+return;/,
  'Free library/search denial is missing');
contains(foundation, /category_filter is not null and category_filter not in/, 'Server category validation is missing');
contains(foundation, /limit safe_page_size/, 'Server pagination is missing');
contains(cutover, /tablename = 'activity_library'[\s\S]*cmd = 'SELECT'/, 'Catalog SELECT policy cutover is missing');
contains(cutover, /policyname <> 'App admins can read all activities'/, 'Admin catalog access is not preserved');
contains(cutover, /revoke insert, update, delete on public\.saved_activities from authenticated/, 'Direct saved-state writes are not revoked');
contains(cutover, /revoke all on public\.daily_fun_activities from authenticated/, 'Legacy whole-library caches remain client-readable');
contains(cutover, /DO NOT deploy until compatible iOS\/Android clients/, 'Released-client staging warning is missing');
contains(familyScreen, /getMyDailyAdventures/, 'Family screen does not use server assignments');
contains(familyScreen, /searchMyActivityLibrary/, 'Pro filters do not use the secured catalog RPC');
contains(familyScreen, /setMyActivityState/, 'Family state writes do not use the secured state RPC');
if (/getRecommendedActivitiesFromLibrary|\.from\(['\"]activity_library['\"]\)|count\s*:\s*100/.test(familyScreen)) {
  throw new Error('Family screen still contains direct/full catalog enumeration');
}
contains(savedScreen, /setMyActivityState/, 'Saved screen does not use the secured state RPC');
if (/\.from\(['\"]saved_activities['\"]\)\s*\.update/.test(savedScreen)) {
  throw new Error('Saved screen still performs direct state writes');
}

pass('Direct enumeration and staged RLS cutover contract');
