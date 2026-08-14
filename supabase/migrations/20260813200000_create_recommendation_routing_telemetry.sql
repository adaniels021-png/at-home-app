begin;

create table public.recommendation_routing_telemetry (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  route text not null check (route in ('LEGACY','SHADOW_V2','CONTROLLED_V2','V2')),
  algorithm_version text not null check (algorithm_version in ('legacy','phase4m-shadow-v2')),
  reason_code text not null check (reason_code in (
    'LEGACY_MODE','FREE_ENTITLEMENT','UNKNOWN_ENTITLEMENT','OUTSIDE_COHORT',
    'CONTROLLED_V2_ELIGIBLE','SHADOW_V2_EVALUATION','V2_MODE_ELIGIBLE',
    'EMERGENCY_LEGACY','CONFIG_INVALID','ENTITLEMENT_RESOLVER_FAILURE',
    'NO_AUTHENTICATED_USER','ROUTER_FAILURE'
  )),
  outcome text not null check (outcome in (
    'LEGACY_SELECTION','SHADOW_SUCCESS','SHADOW_EMPTY_RESULT','SHADOW_ERROR',
    'V2_SUCCESS','V2_EMPTY_RESULT','V2_ERROR'
  )),
  fallback_used boolean not null,
  activation_mode text not null check (activation_mode in (
    'LEGACY','SHADOW_V2','CONTROLLED_V2','V2','EMERGENCY_LEGACY'
  )),
  cohort_percentage integer not null check (cohort_percentage between 0 and 100),
  config_version bigint not null check (config_version >= 0)
);

comment on table public.recommendation_routing_telemetry is
  'Privacy-minimized operational routing outcomes. Contains no user, child, assessment, purchase, or RevenueCat identifiers.';

alter table public.recommendation_routing_telemetry enable row level security;
revoke all on public.recommendation_routing_telemetry from public, anon, authenticated;

create index recommendation_routing_telemetry_created_at_idx
  on public.recommendation_routing_telemetry (created_at desc);

create or replace function public.record_my_recommendation_routing_outcome(requested_outcome text)
returns boolean
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  decision record;
  config public.recommendation_activation_control;
  normalized_outcome text := upper(trim(coalesce(requested_outcome,'')));
  fallback boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  select * into config
  from public.recommendation_activation_control
  where singleton=true;

  select * into decision from public.resolve_my_recommendation_route();

  if decision.route = 'LEGACY' then
    if normalized_outcome <> 'LEGACY_SELECTION' then
      raise exception 'outcome is not valid for server-selected route' using errcode='22023';
    end if;
  elsif decision.route = 'SHADOW_V2' then
    if normalized_outcome not in ('SHADOW_SUCCESS','SHADOW_EMPTY_RESULT','SHADOW_ERROR') then
      raise exception 'outcome is not valid for server-selected route' using errcode='22023';
    end if;
  elsif decision.route in ('CONTROLLED_V2','V2') then
    if normalized_outcome not in ('V2_SUCCESS','V2_EMPTY_RESULT','V2_ERROR') then
      raise exception 'outcome is not valid for server-selected route' using errcode='22023';
    end if;
    fallback := normalized_outcome in ('V2_EMPTY_RESULT','V2_ERROR');
  else
    raise exception 'server-selected route is invalid' using errcode='22023';
  end if;

  insert into public.recommendation_routing_telemetry (
    route, algorithm_version, reason_code, outcome, fallback_used,
    activation_mode, cohort_percentage, config_version
  ) values (
    decision.route,
    decision.algorithm,
    decision.reason_code,
    normalized_outcome,
    fallback,
    coalesce(config.mode,'LEGACY'),
    coalesce(config.controlled_cohort_percentage,0),
    decision.config_version
  );

  return true;
end $$;

revoke all on function public.record_my_recommendation_routing_outcome(text) from public, anon;
grant execute on function public.record_my_recommendation_routing_outcome(text) to authenticated;

create or replace function public.admin_read_recommendation_routing_summary(since_at timestamptz default now() - interval '24 hours')
returns table(
  route text,
  algorithm_version text,
  reason_code text,
  outcome text,
  fallback_used boolean,
  activation_mode text,
  cohort_percentage integer,
  event_count bigint,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language sql
security definer
stable
set search_path=public,pg_temp
as $$
  select
    t.route, t.algorithm_version, t.reason_code, t.outcome, t.fallback_used,
    t.activation_mode, t.cohort_percentage, count(*), min(t.created_at), max(t.created_at)
  from public.recommendation_routing_telemetry t
  where public.is_app_admin()
    and t.created_at >= greatest(since_at, now() - interval '90 days')
  group by t.route, t.algorithm_version, t.reason_code, t.outcome,
    t.fallback_used, t.activation_mode, t.cohort_percentage;
$$;

revoke all on function public.admin_read_recommendation_routing_summary(timestamptz) from public, anon;
grant execute on function public.admin_read_recommendation_routing_summary(timestamptz) to authenticated;

commit;
