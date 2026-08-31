-- Support provider-native illustration formats during approval while preserving
-- strict immutable paths and NULL-aware optimistic concurrency.

create or replace function public.approve_activity_illustration(
  target_illustration_id uuid,
  target_approved_storage_path text,
  target_approved_public_url text,
  expected_current_approved_illustration_id uuid default null
)
returns public.activity_illustrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  candidate public.activity_illustrations%rowtype;
  activity public.activity_library%rowtype;
  expected_extension text;
  current_source_content_hash text;
begin
  if caller_id is null or not public.is_app_admin() then
    raise exception 'ILLUSTRATION_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into candidate
  from public.activity_illustrations illustration
  where illustration.id = target_illustration_id
  for update;
  if candidate.id is null or candidate.status <> 'draft' then
    raise exception 'ILLUSTRATION_NOT_APPROVABLE' using errcode = '55000';
  end if;

  select * into activity
  from public.activity_library item
  where item.id = candidate.activity_id
  for update;
  if activity.id is null then
    raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002';
  end if;
  current_source_content_hash := public.activity_illustration_source_content_hash(activity.id);
  if current_source_content_hash is null
    or current_source_content_hash is distinct from candidate.source_content_hash then
    raise exception 'ILLUSTRATION_SOURCE_CONTENT_CHANGED' using errcode = '40001';
  end if;
  if activity.approved_illustration_id is distinct from expected_current_approved_illustration_id then
    raise exception 'APPROVED_ILLUSTRATION_CHANGED' using errcode = '40001';
  end if;

  expected_extension := case candidate.mime_type
    when 'image/png' then 'png'
    when 'image/jpeg' then 'jpg'
    when 'image/webp' then 'webp'
    else null
  end;
  if expected_extension is null
    or target_approved_storage_path is null
    or target_approved_storage_path !~ (
      '^' || candidate.activity_id::text || '/v' || candidate.version::text
      || '-[0-9a-f]{8,64}[.]' || expected_extension || '$'
    ) then
    raise exception 'INVALID_APPROVED_STORAGE_PATH' using errcode = '22023';
  end if;
  if target_approved_public_url is null
    or target_approved_public_url not like '%/storage/v1/object/public/activity-illustrations/%'
    or target_approved_public_url not like '%' || target_approved_storage_path then
    raise exception 'INVALID_APPROVED_PUBLIC_URL' using errcode = '22023';
  end if;

  if activity.approved_illustration_id is not null then
    update public.activity_illustrations previous
    set status = 'superseded', superseded_by = candidate.id
    where previous.id = activity.approved_illustration_id
      and previous.activity_id = activity.id
      and previous.status = 'approved';
    if not found then
      raise exception 'CURRENT_APPROVED_ILLUSTRATION_INVALID' using errcode = '23514';
    end if;
  end if;

  update public.activity_illustrations illustration
  set status = 'approved',
      approved_storage_path = target_approved_storage_path,
      approved_public_url = target_approved_public_url,
      reviewed_by = caller_id,
      reviewed_at = now()
  where illustration.id = candidate.id
  returning * into candidate;

  update public.activity_library item
  set approved_illustration_id = candidate.id
  where item.id = activity.id;

  return candidate;
end;
$$;

revoke all on function public.approve_activity_illustration(uuid, text, text, uuid) from public, anon;
grant execute on function public.approve_activity_illustration(uuid, text, text, uuid) to authenticated;

comment on function public.approve_activity_illustration(uuid, text, text, uuid) is
  'Atomically approves a reviewed native-format activity illustration with strict MIME/path matching and NULL-aware pointer concurrency.';
