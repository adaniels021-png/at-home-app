import { assert, contains, pass, read } from './daily-adventures-validator-utils.mjs';

const migration = read('supabase/migrations/20260830120000_daily_adventures_phase_a_foundation.sql');
const api = read('lib/dailyAdventuresApi.ts');

for (const rpc of [
  'get_my_daily_adventures',
  'search_my_activity_library',
  'get_my_activity_detail',
  'set_my_activity_state',
  'get_my_saved_activity_snapshot',
  'get_my_surprise_activity',
]) {
  contains(migration, new RegExp(`create or replace function public\\.${rpc}`), `${rpc} is missing`);
  contains(migration, new RegExp(`grant execute on function public\\.${rpc}`), `${rpc} authenticated grant is missing`);
  contains(api, new RegExp(`['\"]${rpc}['\"]`), `${rpc} client helper is missing`);
}

assert((migration.match(/has_child_permission\(target_child_id, 'view_learning_content'\)/g) || []).length >= 5,
  'Every family RPC must enforce child-scoped learning access');
contains(migration, /resolve_child_server_entitlement\(target_child_id\)/, 'Authoritative child entitlement is not reused');
contains(migration, /revoke all on table public\.daily_adventure_assignments from public, anon, authenticated/, 'Assignment table direct access is not revoked');

pass('Daily Adventures Phase A security contracts');
