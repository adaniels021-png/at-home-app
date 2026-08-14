begin;

create table if not exists public.recommendation_activation_control (
  singleton boolean primary key default true check (singleton),
  mode text not null default 'LEGACY' check (mode in ('LEGACY','SHADOW_V2','CONTROLLED_V2','V2','EMERGENCY_LEGACY')),
  algorithm_version text not null default 'phase4m-shadow-v2',
  emergency_kill_switch boolean not null default false,
  controlled_cohort_percentage integer not null default 0 check (controlled_cohort_percentage between 0 and 100),
  config_version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  change_reason text not null default 'Phase 4N safe legacy baseline',
  check (not emergency_kill_switch or mode = 'EMERGENCY_LEGACY')
);

insert into public.recommendation_activation_control(singleton,mode,algorithm_version,emergency_kill_switch,controlled_cohort_percentage)
values(true,'LEGACY','phase4m-shadow-v2',false,0)
on conflict(singleton) do nothing;

alter table public.recommendation_activation_control enable row level security;
revoke all on public.recommendation_activation_control from anon, authenticated;
grant select on public.recommendation_activation_control to authenticated;

drop policy if exists recommendation_activation_control_authenticated_read on public.recommendation_activation_control;
create policy recommendation_activation_control_authenticated_read on public.recommendation_activation_control
for select to authenticated using (true);

drop policy if exists recommendation_activation_control_admin_write on public.recommendation_activation_control;
create policy recommendation_activation_control_admin_write on public.recommendation_activation_control
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create table if not exists public.recommendation_activation_audit (
  id bigint generated always as identity primary key,
  mode text not null,
  algorithm_version text not null,
  emergency_kill_switch boolean not null,
  controlled_cohort_percentage integer not null,
  config_version bigint not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id),
  change_reason text not null
);
alter table public.recommendation_activation_audit enable row level security;
revoke all on public.recommendation_activation_audit from anon, authenticated;
grant select on public.recommendation_activation_audit to authenticated;
create policy recommendation_activation_audit_admin_read on public.recommendation_activation_audit for select to authenticated using (public.is_app_admin());

create or replace function public.audit_recommendation_activation_control() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
  new.updated_at=now();new.updated_by=auth.uid();new.config_version=old.config_version+1;
  insert into public.recommendation_activation_audit(mode,algorithm_version,emergency_kill_switch,controlled_cohort_percentage,config_version,changed_by,change_reason)
  values(new.mode,new.algorithm_version,new.emergency_kill_switch,new.controlled_cohort_percentage,new.config_version,auth.uid(),new.change_reason);
  return new;
end $$;
drop trigger if exists recommendation_activation_control_audit on public.recommendation_activation_control;
create trigger recommendation_activation_control_audit before update on public.recommendation_activation_control for each row execute function public.audit_recommendation_activation_control();

create or replace function public.set_recommendation_activation_control(
  requested_mode text,
  requested_cohort_percentage integer,
  requested_reason text
) returns public.recommendation_activation_control
language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.recommendation_activation_control;
begin
  if not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
  if requested_mode not in ('LEGACY','SHADOW_V2','CONTROLLED_V2','V2','EMERGENCY_LEGACY') then raise exception 'Invalid activation mode'; end if;
  if requested_cohort_percentage not between 0 and 100 then raise exception 'Invalid cohort percentage'; end if;
  if nullif(trim(requested_reason),'') is null then raise exception 'Change reason required'; end if;
  update public.recommendation_activation_control set
    mode=requested_mode,
    emergency_kill_switch=requested_mode='EMERGENCY_LEGACY',
    controlled_cohort_percentage=requested_cohort_percentage,
    change_reason=requested_reason
  where singleton=true returning * into result;
  return result;
end $$;
revoke all on function public.set_recommendation_activation_control(text,integer,text) from public,anon;
grant execute on function public.set_recommendation_activation_control(text,integer,text) to authenticated;

commit;
