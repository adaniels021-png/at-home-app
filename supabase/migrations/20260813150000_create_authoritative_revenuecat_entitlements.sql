begin;

create table public.revenuecat_entitlement_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null check (state in ('FREE','TRIAL','PRO','UNKNOWN')),
  entitlement_id text not null,
  product_id text,
  store text,
  environment text not null default 'PRODUCTION',
  entitlement_active boolean not null default false,
  period_type text,
  expires_at timestamptz,
  auto_renewing boolean,
  billing_issue_detected boolean not null default false,
  last_event_id text not null unique,
  last_event_type text not null,
  last_event_at timestamptz not null,
  last_synced_at timestamptz not null default now(),
  source text not null default 'revenuecat' check (source='revenuecat'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.revenuecat_entitlement_state enable row level security;
revoke all on public.revenuecat_entitlement_state from public,anon,authenticated;

create table public.revenuecat_webhook_events (
  event_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_at timestamptz not null,
  processing_result text not null check(processing_result in ('APPLIED','DUPLICATE','STALE','IGNORED','REJECTED')),
  processed_at timestamptz not null default now()
);
alter table public.revenuecat_webhook_events enable row level security;
revoke all on public.revenuecat_webhook_events from public,anon,authenticated;

create or replace function public.resolve_my_server_entitlement()
returns table(state text,is_v2_eligible_tier boolean,expires_at timestamptz,source text,authoritative boolean,reason text)
language plpgsql security definer stable set search_path=public,pg_temp as $$
declare r public.revenuecat_entitlement_state;
begin
 if auth.uid() is null then return query select 'UNKNOWN',false,null::timestamptz,'revenuecat',false,'UNAUTHENTICATED';return;end if;
 select * into r from public.revenuecat_entitlement_state where user_id=auth.uid();
 if r.user_id is null then return query select 'UNKNOWN',false,null::timestamptz,'revenuecat',false,'NOT_SYNCHRONIZED';return;end if;
 if r.entitlement_active and (r.expires_at is null or r.expires_at>now()) and r.state in ('TRIAL','PRO') then
   return query select r.state,true,r.expires_at,r.source,true,'ACTIVE_REVENUECAT_ENTITLEMENT';
 elsif not r.entitlement_active or (r.expires_at is not null and r.expires_at<=now()) then
   return query select 'FREE',false,r.expires_at,r.source,true,'NO_ACTIVE_ENTITLEMENT';
 else return query select 'UNKNOWN',false,r.expires_at,r.source,false,'INVALID_SYNCHRONIZED_STATE';
 end if;
end $$;
revoke all on function public.resolve_my_server_entitlement() from public,anon;
grant execute on function public.resolve_my_server_entitlement() to authenticated;

create or replace function public.admin_read_revenuecat_entitlement_summary()
returns table(state text,count bigint) language sql security definer stable set search_path=public,pg_temp as $$
 select e.state,count(*) from public.revenuecat_entitlement_state e where public.is_app_admin() group by e.state
$$;
revoke all on function public.admin_read_revenuecat_entitlement_summary() from public,anon;
grant execute on function public.admin_read_revenuecat_entitlement_summary() to authenticated;

commit;
