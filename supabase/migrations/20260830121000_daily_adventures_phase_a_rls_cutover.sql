-- Daily Adventures 2.0 Phase A staged RLS cutover.
-- DO NOT deploy until compatible iOS/Android clients use the secure RPCs.
-- Foundation RPCs may be deployed earlier; this migration is intentionally
-- separated because released clients directly read/write these tables.

begin;

alter table public.activity_library enable row level security;

-- Remove family-facing SELECT policies while preserving the explicit admin
-- policy created by the Content Studio authorization migration.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'activity_library'
      and cmd = 'SELECT'
      and policyname <> 'App admins can read all activities'
  loop
    execute format('drop policy %I on public.activity_library', policy_record.policyname);
  end loop;
end
$$;

-- New family state writes must use set_my_activity_state. Existing reads are
-- retained for legacy saved-history UI; direct writes are removed at cutover.
alter table public.saved_activities enable row level security;
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'saved_activities'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.saved_activities', policy_record.policyname);
  end loop;
end
$$;

revoke insert, update, delete on public.saved_activities from authenticated;

-- Legacy filter caches may contain whole approved-library arrays. Preserve the
-- rows for history/migration, but remove all client access after adoption.
alter table public.daily_fun_activities enable row level security;
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'daily_fun_activities'
  loop
    execute format('drop policy %I on public.daily_fun_activities', policy_record.policyname);
  end loop;
end
$$;

revoke all on public.daily_fun_activities from authenticated;

commit;
