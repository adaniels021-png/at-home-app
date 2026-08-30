-- Phase C.3 persistent generation cost controls and admin read contract.
-- Forward-only local migration. Do not apply as part of C.3 local validation.
begin;

alter table public.activity_illustrations
  add column provider_started_at timestamptz;

create or replace function public.enforce_activity_illustration_generation_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.activity_illustrations prior
    where prior.activity_id = new.activity_id
      and prior.created_at > now() - interval '60 seconds'
  ) then
    raise exception 'ILLUSTRATION_ACTIVITY_COOLDOWN' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.activity_illustrations recent
    where recent.created_by = new.created_by
      and recent.created_at > now() - interval '15 minutes'
  ) >= 10 then
    raise exception 'ILLUSTRATION_ADMIN_RATE_LIMIT' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.activity_illustrations recent
    where recent.created_at > now() - interval '1 day'
  ) >= 50 then
    raise exception 'ILLUSTRATION_PROJECT_RATE_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger activity_illustrations_generation_limits
before insert on public.activity_illustrations
for each row execute function public.enforce_activity_illustration_generation_limits();

revoke all on function public.enforce_activity_illustration_generation_limits()
  from public, anon, authenticated;

create or replace function public.claim_activity_illustration_provider_call(
  target_illustration_id uuid,
  target_idempotency_key uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare claimed boolean;
begin
  update public.activity_illustrations illustration
  set provider_started_at = now()
  where illustration.id = target_illustration_id
    and illustration.idempotency_key = target_idempotency_key
    and illustration.status = 'generating'
    and illustration.provider_started_at is null
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_activity_illustration_provider_call(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_activity_illustration_provider_call(uuid, uuid)
  to service_role;

create or replace function public.get_admin_activity_illustration_state(
  target_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity public.activity_library%rowtype;
  current_hash text;
  approved public.activity_illustrations%rowtype;
  candidate public.activity_illustrations%rowtype;
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'ILLUSTRATION_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select * into activity from public.activity_library where id = target_activity_id;
  if activity.id is null then
    raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002';
  end if;
  current_hash := public.activity_illustration_source_content_hash(activity.id);
  select * into approved from public.activity_illustrations
    where id = activity.approved_illustration_id;
  select * into candidate from public.activity_illustrations
    where activity_id = activity.id and status in ('generating', 'draft', 'failed')
    order by version desc limit 1;
  return pg_catalog.jsonb_build_object(
    'activity_id', activity.id,
    'current_source_content_hash', current_hash,
    'artwork_may_be_outdated', approved.id is not null and approved.source_content_hash <> current_hash,
    'approved', case when approved.id is null then null else pg_catalog.jsonb_build_object(
      'id', approved.id, 'version', approved.version, 'status', approved.status,
      'approved_public_url', approved.approved_public_url,
      'source_content_hash', approved.source_content_hash,
      'created_at', approved.created_at, 'generated_at', approved.generated_at,
      'reviewed_at', approved.reviewed_at
    ) end,
    'candidate', case when candidate.id is null then null else pg_catalog.jsonb_build_object(
      'id', candidate.id, 'version', candidate.version, 'status', candidate.status,
      'source_content_hash', candidate.source_content_hash,
      'created_at', candidate.created_at, 'generated_at', candidate.generated_at,
      'error_code', candidate.error_code,
      'error_message', pg_catalog.left(candidate.error_message, 180)
    ) end
  );
end;
$$;

revoke all on function public.get_admin_activity_illustration_state(uuid)
  from public, anon;
grant execute on function public.get_admin_activity_illustration_state(uuid)
  to authenticated;

commit;
