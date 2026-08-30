import { contains, pass, read } from './daily-adventures-validator-utils.mjs';

const sql = read('supabase/migrations/20260830120000_daily_adventures_phase_a_foundation.sql');

contains(sql, /add column if not exists library_activity_id uuid/, 'Stable saved activity reference is missing');
contains(sql, /on delete set null/, 'Saved history is not preserved on activity deletion');
contains(sql, /activity_json = excluded\.activity_json/, 'Legacy JSON snapshot is not retained');
contains(sql, /coalesce\(saved\.is_saved, false\)[\s\S]*coalesce\(saved\.is_favorite, false\)[\s\S]*coalesce\(saved\.completed, false\)/,
  'Saved/favorite/completed retained access is incomplete');
contains(sql, /if not has_retained_access then[\s\S]*ACTIVITY_NOT_AUTHORIZED/, 'Arbitrary save authorization is not rejected');
contains(sql, /create or replace function public\.get_my_saved_activity_snapshot/, 'Historical snapshot detail contract is missing');
contains(sql, /public\.daily_adventures_child_is_pro\(target_child_id\)[\s\S]*daily_adventure_assignments[\s\S]*saved_activities/,
  'State writes do not prove Pro, daily, or existing retained access');

pass('Saved activity retention and arbitrary-save protection');
