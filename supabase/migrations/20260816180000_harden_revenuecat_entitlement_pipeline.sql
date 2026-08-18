begin;

-- Keep webhook state application and its required processing receipt atomic.
create or replace function public.apply_revenuecat_entitlement_event(
  requested_event_id text,
  requested_user_id uuid,
  requested_event_type text,
  requested_event_at timestamptz,
  requested_state text,
  requested_entitlement_id text,
  requested_product_id text,
  requested_store text,
  requested_environment text,
  requested_entitlement_active boolean,
  requested_period_type text,
  requested_expires_at timestamptz,
  requested_auto_renewing boolean,
  requested_billing_issue boolean
)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare current_event_at timestamptz;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if requested_environment not in ('PRODUCTION','SANDBOX') then raise exception 'unsupported RevenueCat environment'; end if;

  if exists(select 1 from public.revenuecat_webhook_events where event_id=requested_event_id) then
    return 'DUPLICATE';
  end if;

  select last_event_at into current_event_at
  from public.revenuecat_entitlement_state
  where user_id=requested_user_id
  for update;

  if current_event_at is not null and current_event_at > requested_event_at then
    insert into public.revenuecat_webhook_events(event_id,user_id,event_type,event_at,processing_result)
    values(requested_event_id,requested_user_id,requested_event_type,requested_event_at,'STALE');
    return 'STALE';
  end if;

  insert into public.revenuecat_entitlement_state(
    user_id,state,entitlement_id,product_id,store,environment,
    entitlement_active,period_type,expires_at,auto_renewing,
    billing_issue_detected,last_event_id,last_event_type,last_event_at,
    last_synced_at,updated_at
  ) values (
    requested_user_id,requested_state,requested_entitlement_id,
    requested_product_id,requested_store,requested_environment,
    requested_entitlement_active,requested_period_type,requested_expires_at,
    requested_auto_renewing,requested_billing_issue,requested_event_id,
    requested_event_type,requested_event_at,now(),now()
  )
  on conflict(user_id) do update set
    state=excluded.state,
    entitlement_id=excluded.entitlement_id,
    product_id=excluded.product_id,
    store=excluded.store,
    environment=excluded.environment,
    entitlement_active=excluded.entitlement_active,
    period_type=excluded.period_type,
    expires_at=excluded.expires_at,
    auto_renewing=excluded.auto_renewing,
    billing_issue_detected=excluded.billing_issue_detected,
    last_event_id=excluded.last_event_id,
    last_event_type=excluded.last_event_type,
    last_event_at=excluded.last_event_at,
    last_synced_at=excluded.last_synced_at,
    updated_at=excluded.updated_at;

  insert into public.revenuecat_webhook_events(event_id,user_id,event_type,event_at,processing_result)
  values(requested_event_id,requested_user_id,requested_event_type,requested_event_at,'APPLIED');
  return 'APPLIED';
end $$;

revoke all on function public.apply_revenuecat_entitlement_event(text,uuid,text,timestamptz,text,text,text,text,text,boolean,text,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.apply_revenuecat_entitlement_event(text,uuid,text,timestamptz,text,text,text,text,text,boolean,text,timestamptz,boolean,boolean) to service_role;

-- Reconciliation applies an authoritative RevenueCat snapshot for one user.
create or replace function public.reconcile_revenuecat_entitlement_snapshot(
  requested_user_id uuid,
  requested_fingerprint text,
  requested_state text,
  requested_entitlement_id text,
  requested_product_id text,
  requested_store text,
  requested_environment text,
  requested_entitlement_active boolean,
  requested_period_type text,
  requested_expires_at timestamptz,
  requested_auto_renewing boolean,
  requested_billing_issue boolean,
  requested_observed_at timestamptz
)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare reconciliation_event_id text := 'reconcile:' || requested_user_id::text || ':' || requested_fingerprint;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if requested_environment not in ('PRODUCTION','SANDBOX','UNKNOWN') then raise exception 'unsupported RevenueCat environment'; end if;
  if exists(select 1 from public.revenuecat_webhook_events where event_id=reconciliation_event_id) then
    update public.revenuecat_entitlement_state set last_synced_at=now(),updated_at=now()
    where user_id=requested_user_id;
    return 'UNCHANGED';
  end if;

  insert into public.revenuecat_entitlement_state(
    user_id,state,entitlement_id,product_id,store,environment,
    entitlement_active,period_type,expires_at,auto_renewing,
    billing_issue_detected,last_event_id,last_event_type,last_event_at,
    last_synced_at,updated_at
  ) values (
    requested_user_id,requested_state,requested_entitlement_id,
    requested_product_id,requested_store,requested_environment,
    requested_entitlement_active,requested_period_type,requested_expires_at,
    requested_auto_renewing,requested_billing_issue,reconciliation_event_id,
    'SERVER_RECONCILIATION',requested_observed_at,now(),now()
  )
  on conflict(user_id) do update set
    state=excluded.state,
    entitlement_id=excluded.entitlement_id,
    product_id=excluded.product_id,
    store=excluded.store,
    environment=excluded.environment,
    entitlement_active=excluded.entitlement_active,
    period_type=excluded.period_type,
    expires_at=excluded.expires_at,
    auto_renewing=excluded.auto_renewing,
    billing_issue_detected=excluded.billing_issue_detected,
    last_event_id=excluded.last_event_id,
    last_event_type=excluded.last_event_type,
    last_event_at=excluded.last_event_at,
    last_synced_at=excluded.last_synced_at,
    updated_at=excluded.updated_at;

  insert into public.revenuecat_webhook_events(event_id,user_id,event_type,event_at,processing_result)
  values(reconciliation_event_id,requested_user_id,'SERVER_RECONCILIATION',requested_observed_at,'APPLIED');
  return 'APPLIED';
end $$;

revoke all on function public.reconcile_revenuecat_entitlement_snapshot(uuid,text,text,text,text,text,text,boolean,text,timestamptz,boolean,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.reconcile_revenuecat_entitlement_snapshot(uuid,text,text,text,text,text,text,boolean,text,timestamptz,boolean,boolean,timestamptz) to service_role;

-- Only a positively identified production RevenueCat entitlement is eligible.
create or replace function public.resolve_my_server_entitlement()
returns table(state text,is_v2_eligible_tier boolean,expires_at timestamptz,source text,authoritative boolean,reason text)
language plpgsql security definer stable set search_path=public,pg_temp as $$
declare r public.revenuecat_entitlement_state;
begin
 if auth.uid() is null then return query select 'UNKNOWN',false,null::timestamptz,'revenuecat',false,'UNAUTHENTICATED';return;end if;
 select * into r from public.revenuecat_entitlement_state where user_id=auth.uid();
 if r.user_id is null then return query select 'UNKNOWN',false,null::timestamptz,'revenuecat',false,'NOT_SYNCHRONIZED';return;end if;
 if r.environment <> 'PRODUCTION' then return query select 'UNKNOWN',false,r.expires_at,r.source,false,'NON_PRODUCTION_ENTITLEMENT';return;end if;
 if r.entitlement_active and (r.expires_at is null or r.expires_at>now()) and r.state in ('TRIAL','PRO') then
   return query select r.state,true,r.expires_at,r.source,true,'ACTIVE_REVENUECAT_ENTITLEMENT';
 elsif not r.entitlement_active or (r.expires_at is not null and r.expires_at<=now()) then
   return query select 'FREE',false,r.expires_at,r.source,true,'NO_ACTIVE_ENTITLEMENT';
 else return query select 'UNKNOWN',false,r.expires_at,r.source,false,'INVALID_SYNCHRONIZED_STATE';
 end if;
end $$;
revoke all on function public.resolve_my_server_entitlement() from public,anon;
grant execute on function public.resolve_my_server_entitlement() to authenticated;

commit;
