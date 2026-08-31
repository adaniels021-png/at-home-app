-- Daily Adventures manual illustration uploads share the existing lifecycle,
-- private review bucket, approval RPC, and family-visible approved pointer.

begin;

alter table public.activity_illustrations
  add column source_type text not null default 'ai'
  check (source_type in ('ai', 'manual_upload'));

alter table public.activity_illustrations
  drop constraint activity_illustrations_lifecycle_check;

alter table public.activity_illustrations
  add constraint activity_illustrations_lifecycle_check check (
    case status
      when 'generating' then
        reviewed_at is null and reviewed_by is null
        and draft_storage_path is null
        and approved_storage_path is null and approved_public_url is null
      when 'draft' then
        draft_storage_path is not null and generated_at is not null
        and mime_type is not null and width is not null and height is not null
        and byte_size is not null and sha256 is not null
        and approved_storage_path is null and approved_public_url is null
        and reviewed_at is null and reviewed_by is null
      when 'approved' then
        draft_storage_path is not null and generated_at is not null
        and approved_storage_path is not null and approved_public_url is not null
        and reviewed_at is not null and reviewed_by is not null
        and superseded_by is null
      when 'rejected' then
        draft_storage_path is not null and generated_at is not null
        and reviewed_at is not null and reviewed_by is not null
        and rejection_reason is not null
        and approved_storage_path is null and approved_public_url is null
      when 'failed' then
        error_code is not null
        and approved_storage_path is null and approved_public_url is null
        and reviewed_at is null and reviewed_by is null
      when 'superseded' then
        approved_storage_path is not null and approved_public_url is not null
        and reviewed_at is not null and reviewed_by is not null
        and superseded_by is not null
      else false
    end
    and case when status in ('draft', 'approved', 'rejected', 'superseded') then
      case source_type
        when 'ai' then prompt_version is not null and prompt_hash is not null
          and prompt_snapshot is not null and provider is not null and model is not null
        when 'manual_upload' then prompt_version is null and prompt_hash is null
          and prompt_snapshot is null and provider is null and model is null
        else false
      end
    else true end
  );

create or replace function public.reserve_activity_illustration_upload(
  target_activity_id uuid,
  target_idempotency_key uuid,
  expected_current_approved_illustration_id uuid default null
)
returns table(
  illustration_id uuid, activity_id uuid, version integer, status text,
  source_content_hash text, idempotency_key uuid, already_existed boolean
)
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  activity public.activity_library%rowtype;
  existing public.activity_illustrations%rowtype;
  next_version integer;
  content_hash text;
begin
  if caller_id is null then
    raise exception 'ILLUSTRATION_AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if not public.is_app_admin() then
    raise exception 'ILLUSTRATION_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if target_activity_id is null or target_idempotency_key is null then
    raise exception 'INVALID_ILLUSTRATION_UPLOAD' using errcode = '22023';
  end if;

  select * into existing from public.activity_illustrations candidate
  where candidate.idempotency_key = target_idempotency_key;
  if existing.id is not null then
    if existing.activity_id <> target_activity_id or existing.source_type <> 'manual_upload' then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;
    return query select existing.id, existing.activity_id, existing.version,
      existing.status, existing.source_content_hash, existing.idempotency_key, true;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('activity-illustration:' || target_activity_id::text, 0)
  );
  select * into existing from public.activity_illustrations candidate
  where candidate.idempotency_key = target_idempotency_key;
  if existing.id is not null then
    if existing.activity_id <> target_activity_id or existing.source_type <> 'manual_upload' then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;
    return query select existing.id, existing.activity_id, existing.version,
      existing.status, existing.source_content_hash, existing.idempotency_key, true;
    return;
  end if;

  select * into activity from public.activity_library item
  where item.id = target_activity_id for update;
  if activity.id is null then raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002'; end if;
  if activity.status <> 'approved' then
    raise exception 'ACTIVITY_NOT_ILLUSTRATION_ELIGIBLE' using errcode = '22023';
  end if;
  if activity.approved_illustration_id is distinct from expected_current_approved_illustration_id then
    raise exception 'APPROVED_ILLUSTRATION_CHANGED' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.activity_illustrations candidate
    where candidate.activity_id = target_activity_id
      and candidate.status in ('generating', 'draft')
  ) then
    raise exception 'ILLUSTRATION_CANDIDATE_ACTIVE' using errcode = '55000';
  end if;

  select coalesce(max(candidate.version), 0) + 1 into next_version
  from public.activity_illustrations candidate where candidate.activity_id = target_activity_id;
  content_hash := public.activity_illustration_source_content_hash(target_activity_id);
  if content_hash is null then raise exception 'ACTIVITY_CONTENT_HASH_FAILED' using errcode = '22023'; end if;

  insert into public.activity_illustrations (
    activity_id, version, status, generation_reason, idempotency_key,
    source_content_hash, source_type, created_by
  ) values (
    target_activity_id, next_version, 'generating',
    case when activity.approved_illustration_id is null then 'missing' else 'regenerate' end,
    target_idempotency_key, content_hash, 'manual_upload', caller_id
  ) returning * into existing;

  return query select existing.id, existing.activity_id, existing.version,
    existing.status, existing.source_content_hash, existing.idempotency_key, false;
end;
$$;

create or replace function public.mark_activity_illustration_manual_draft(
  target_illustration_id uuid,
  target_draft_storage_path text,
  target_mime_type text,
  target_width integer,
  target_height integer,
  target_byte_size integer,
  target_sha256 text
)
returns public.activity_illustrations
language plpgsql security definer set search_path = '' as $$
declare
  result public.activity_illustrations%rowtype;
  extension text := case target_mime_type
    when 'image/png' then 'png' when 'image/jpeg' then 'jpg'
    when 'image/webp' then 'webp' else null end;
begin
  update public.activity_illustrations illustration
  set status = 'draft',
      draft_storage_path = target_draft_storage_path,
      mime_type = target_mime_type,
      width = target_width, height = target_height,
      byte_size = target_byte_size, sha256 = pg_catalog.lower(target_sha256),
      generated_at = now(), error_code = null, error_message = null
  where illustration.id = target_illustration_id
    and illustration.status = 'generating'
    and illustration.source_type = 'manual_upload'
    and extension is not null
    and target_draft_storage_path = illustration.activity_id::text || '/' || illustration.id::text || '/draft.' || extension
    and target_width between 512 and 4096 and target_height between 512 and 4096
    and target_byte_size between 1 and 5242880
    and target_sha256 ~ '^[0-9a-f]{64}$'
  returning * into result;
  if result.id is null then
    raise exception 'MANUAL_ILLUSTRATION_DRAFT_INVALID' using errcode = '22023';
  end if;
  return result;
end;
$$;

revoke all on function public.reserve_activity_illustration_upload(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.reserve_activity_illustration_upload(uuid, uuid, uuid)
  to authenticated;
revoke all on function public.mark_activity_illustration_manual_draft(uuid, text, text, integer, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.mark_activity_illustration_manual_draft(uuid, text, text, integer, integer, integer, text)
  to service_role;

create or replace function public.get_admin_activity_illustration_state(target_activity_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if activity.id is null then raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002'; end if;
  current_hash := public.activity_illustration_source_content_hash(activity.id);
  select * into approved from public.activity_illustrations where id = activity.approved_illustration_id;
  select * into candidate from public.activity_illustrations
    where activity_id = activity.id and status in ('generating', 'draft', 'failed')
    order by version desc limit 1;
  return pg_catalog.jsonb_build_object(
    'activity_id', activity.id,
    'current_source_content_hash', current_hash,
    'artwork_may_be_outdated', approved.id is not null and approved.source_content_hash <> current_hash,
    'approved', case when approved.id is null then null else pg_catalog.jsonb_build_object(
      'id', approved.id, 'version', approved.version, 'status', approved.status,
      'source_type', approved.source_type, 'approved_public_url', approved.approved_public_url,
      'source_content_hash', approved.source_content_hash, 'created_at', approved.created_at,
      'generated_at', approved.generated_at, 'reviewed_at', approved.reviewed_at) end,
    'candidate', case when candidate.id is null then null else pg_catalog.jsonb_build_object(
      'id', candidate.id, 'version', candidate.version, 'status', candidate.status,
      'source_type', candidate.source_type, 'source_content_hash', candidate.source_content_hash,
      'created_at', candidate.created_at, 'generated_at', candidate.generated_at,
      'error_code', candidate.error_code,
      'error_message', pg_catalog.left(candidate.error_message, 180)) end
  );
end;
$$;

revoke all on function public.get_admin_activity_illustration_state(uuid) from public, anon;
grant execute on function public.get_admin_activity_illustration_state(uuid) to authenticated;

commit;
