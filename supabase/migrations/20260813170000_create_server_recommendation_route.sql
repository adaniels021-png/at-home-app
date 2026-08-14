begin;

create or replace function public.resolve_my_recommendation_route()
returns table(
  route text,
  algorithm text,
  entitlement text,
  cohort_eligible boolean,
  cohort_bucket integer,
  reason_code text,
  fallback_allowed boolean,
  config_version bigint
)
language plpgsql
security definer
stable
set search_path=public,extensions,pg_temp
as $$
declare
  uid uuid := auth.uid();
  config public.recommendation_activation_control;
  resolved record;
  bucket integer;
  eligible boolean := false;
begin
  if uid is null then
    return query select 'LEGACY','legacy','UNKNOWN',false,null::integer,'NO_AUTHENTICATED_USER',true,0::bigint;
    return;
  end if;

  select * into config from public.recommendation_activation_control where singleton=true;
  if config.singleton is null or config.algorithm_version <> 'phase4m-shadow-v2'
     or config.controlled_cohort_percentage not between 0 and 100 then
    return query select 'LEGACY','legacy','UNKNOWN',false,null::integer,'CONFIG_INVALID',true,0::bigint;
    return;
  end if;

  select * into resolved from public.resolve_my_server_entitlement();
  if resolved.state is null or resolved.state not in ('FREE','TRIAL','PRO','UNKNOWN') then
    return query select 'LEGACY','legacy','UNKNOWN',false,null::integer,'ENTITLEMENT_RESOLVER_FAILURE',true,config.config_version;
    return;
  end if;

  bucket := (('x'||substr(encode(digest(uid::text,'sha256'),'hex'),1,8))::bit(32)::bigint % 10000)::integer;
  eligible := resolved.state in ('TRIAL','PRO')
    and resolved.authoritative
    and resolved.is_v2_eligible_tier
    and bucket < config.controlled_cohort_percentage * 100;

  if config.emergency_kill_switch or config.mode='EMERGENCY_LEGACY' then
    return query select 'LEGACY','legacy',resolved.state,false,bucket,'EMERGENCY_LEGACY',true,config.config_version;
  elsif config.mode='LEGACY' then
    return query select 'LEGACY','legacy',resolved.state,false,bucket,'LEGACY_MODE',true,config.config_version;
  elsif resolved.state='FREE' then
    return query select 'LEGACY','legacy','FREE',false,bucket,'FREE_ENTITLEMENT',true,config.config_version;
  elsif resolved.state='UNKNOWN' or not resolved.authoritative then
    return query select 'LEGACY','legacy','UNKNOWN',false,bucket,'UNKNOWN_ENTITLEMENT',true,config.config_version;
  elsif config.mode='SHADOW_V2' then
    return query select 'SHADOW_V2','phase4m-shadow-v2',resolved.state,false,bucket,'SHADOW_V2_EVALUATION',true,config.config_version;
  elsif config.mode='CONTROLLED_V2' and eligible then
    return query select 'CONTROLLED_V2','phase4m-shadow-v2',resolved.state,true,bucket,'CONTROLLED_V2_ELIGIBLE',true,config.config_version;
  elsif config.mode='CONTROLLED_V2' then
    return query select 'LEGACY','legacy',resolved.state,false,bucket,'OUTSIDE_COHORT',true,config.config_version;
  elsif config.mode='V2' and resolved.state in ('TRIAL','PRO') and resolved.authoritative and resolved.is_v2_eligible_tier then
    return query select 'V2','phase4m-shadow-v2',resolved.state,true,bucket,'V2_MODE_ELIGIBLE',true,config.config_version;
  else
    return query select 'LEGACY','legacy',resolved.state,false,bucket,'CONFIG_INVALID',true,config.config_version;
  end if;
exception when others then
  return query select 'LEGACY','legacy','UNKNOWN',false,null::integer,'ROUTER_FAILURE',true,0::bigint;
end $$;

revoke all on function public.resolve_my_recommendation_route() from public,anon;
grant execute on function public.resolve_my_recommendation_route() to authenticated;

commit;
