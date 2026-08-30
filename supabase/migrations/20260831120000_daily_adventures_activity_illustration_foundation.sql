-- Daily Adventures 2.0 Phase C.2: activity illustration security foundation.
-- This migration creates metadata and server contracts only. It intentionally
-- creates no Storage buckets and performs no image generation.

begin;

create table public.activity_illustrations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activity_library(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null check (status in (
    'generating', 'draft', 'approved', 'rejected', 'failed', 'superseded'
  )),
  generation_reason text not null check (generation_reason in ('missing', 'regenerate')),
  idempotency_key uuid not null unique,
  source_content_hash text not null check (source_content_hash ~ '^[0-9a-f]{64}$'),
  prompt_version text,
  prompt_hash text check (prompt_hash is null or prompt_hash ~ '^[0-9a-f]{64}$'),
  prompt_snapshot text,
  provider text,
  model text,
  draft_storage_path text,
  approved_storage_path text,
  approved_public_url text,
  mime_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  byte_size integer check (byte_size is null or byte_size between 1 and 768000),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  generation_attempt integer not null default 1 check (generation_attempt > 0),
  error_code text check (error_code is null or (char_length(error_code) between 1 and 80 and error_code ~ '^[A-Z0-9_]+$')),
  error_message text check (error_message is null or char_length(error_message) <= 500),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  superseded_by uuid references public.activity_illustrations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generation_started_at timestamptz not null default now(),
  generated_at timestamptz,
  reviewed_at timestamptz,
  unique (activity_id, version),
  constraint activity_illustrations_lifecycle_check check (
    case status
      when 'generating' then
        reviewed_at is null and reviewed_by is null
        and draft_storage_path is null
        and approved_storage_path is null and approved_public_url is null
      when 'draft' then
        draft_storage_path is not null and generated_at is not null
        and prompt_version is not null and prompt_hash is not null and prompt_snapshot is not null
        and provider is not null and model is not null
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
  )
);

create index activity_illustrations_activity_status_idx
  on public.activity_illustrations(activity_id, status);
create index activity_illustrations_status_idx
  on public.activity_illustrations(status);
create index activity_illustrations_created_at_idx
  on public.activity_illustrations(created_at);
create index activity_illustrations_source_content_hash_idx
  on public.activity_illustrations(source_content_hash);
create unique index activity_illustrations_one_candidate_per_activity_idx
  on public.activity_illustrations(activity_id)
  where status in ('generating', 'draft');

alter table public.activity_illustrations enable row level security;
revoke all on table public.activity_illustrations from public, anon, authenticated;

create policy activity_illustrations_admin_read
on public.activity_illustrations
for select to authenticated
using (public.is_app_admin());

grant select on table public.activity_illustrations to authenticated;

create or replace function public.set_activity_illustration_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger activity_illustrations_set_updated_at
before update on public.activity_illustrations
for each row execute function public.set_activity_illustration_updated_at();

revoke all on function public.set_activity_illustration_updated_at() from public, anon, authenticated;

alter table public.activity_library
  add column approved_illustration_id uuid
  references public.activity_illustrations(id) on delete restrict;

create index activity_library_approved_illustration_idx
  on public.activity_library(approved_illustration_id)
  where approved_illustration_id is not null;

create or replace function public.enforce_activity_approved_illustration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.approved_illustration_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.activity_illustrations illustration
    where illustration.id = new.approved_illustration_id
      and illustration.activity_id = new.id
      and illustration.status = 'approved'
  ) then
    raise exception 'INVALID_ACTIVITY_APPROVED_ILLUSTRATION' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger activity_library_enforce_approved_illustration
before insert or update of approved_illustration_id on public.activity_library
for each row execute function public.enforce_activity_approved_illustration();

revoke all on function public.enforce_activity_approved_illustration() from public, anon, authenticated;

create or replace function public.activity_illustration_source_content_hash(target_activity_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'title', pg_catalog.regexp_replace(pg_catalog.btrim(activity.title), '\s+', ' ', 'g'),
          'category', pg_catalog.lower(pg_catalog.btrim(activity.category)),
          'location', pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(activity.location, '')), '\s+', ' ', 'g'),
          'description', pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(activity.description, '')), '\s+', ' ', 'g'),
          'try_this', coalesce((
            select pg_catalog.jsonb_agg(
              pg_catalog.regexp_replace(pg_catalog.btrim(item.value), '\s+', ' ', 'g')
              order by item.ordinality
            )
            from pg_catalog.unnest(activity.try_this) with ordinality as item(value, ordinality)
          ), '[]'::jsonb),
          'materials', coalesce((
            select pg_catalog.jsonb_agg(
              pg_catalog.regexp_replace(pg_catalog.btrim(item.value), '\s+', ' ', 'g')
              order by item.ordinality
            )
            from pg_catalog.unnest(activity.materials) with ordinality as item(value, ordinality)
          ), '[]'::jsonb),
          'why_it_helps', pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(activity.why_it_helps, '')), '\s+', ' ', 'g')
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  from public.activity_library activity
  where activity.id = target_activity_id;
$$;

revoke all on function public.activity_illustration_source_content_hash(uuid) from public, anon, authenticated;
grant execute on function public.activity_illustration_source_content_hash(uuid) to service_role;

create or replace function public.reserve_activity_illustration_generation(
  target_activity_id uuid,
  target_generation_reason text,
  target_idempotency_key uuid,
  expected_current_approved_illustration_id uuid default null
)
returns table(
  illustration_id uuid,
  activity_id uuid,
  version integer,
  status text,
  source_content_hash text,
  idempotency_key uuid,
  created_at timestamptz,
  already_existed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
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
  if target_activity_id is null or target_idempotency_key is null
    or target_generation_reason not in ('missing', 'regenerate') then
    raise exception 'INVALID_ILLUSTRATION_RESERVATION' using errcode = '22023';
  end if;

  select * into existing
  from public.activity_illustrations candidate
  where candidate.idempotency_key = target_idempotency_key;

  if existing.id is not null then
    if existing.activity_id <> target_activity_id
      or existing.generation_reason <> target_generation_reason then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;
    return query select existing.id, existing.activity_id, existing.version,
      existing.status, existing.source_content_hash, existing.idempotency_key,
      existing.created_at, true;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('activity-illustration:' || target_activity_id::text, 0)
  );

  -- A concurrent request may have committed this key while this transaction
  -- waited for the per-activity lock. Recheck before any new reservation.
  select * into existing
  from public.activity_illustrations candidate
  where candidate.idempotency_key = target_idempotency_key;

  if existing.id is not null then
    if existing.activity_id <> target_activity_id
      or existing.generation_reason <> target_generation_reason then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;
    return query select existing.id, existing.activity_id, existing.version,
      existing.status, existing.source_content_hash, existing.idempotency_key,
      existing.created_at, true;
    return;
  end if;

  select * into activity
  from public.activity_library candidate
  where candidate.id = target_activity_id
  for update;

  if activity.id is null then
    raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002';
  end if;
  if activity.status <> 'approved' then
    raise exception 'ACTIVITY_NOT_ILLUSTRATION_ELIGIBLE' using errcode = '22023';
  end if;
  if expected_current_approved_illustration_id is not null
    and expected_current_approved_illustration_id is distinct from activity.approved_illustration_id then
    raise exception 'APPROVED_ILLUSTRATION_CHANGED' using errcode = '40001';
  end if;
  if target_generation_reason = 'missing' and activity.approved_illustration_id is not null then
    raise exception 'ACTIVITY_ALREADY_HAS_APPROVED_ILLUSTRATION' using errcode = '22023';
  end if;

  select * into existing
  from public.activity_illustrations candidate
  where candidate.activity_id = target_activity_id
    and candidate.status in ('generating', 'draft')
  order by candidate.version desc
  limit 1;

  if existing.id is not null then
    return query select existing.id, existing.activity_id, existing.version,
      existing.status, existing.source_content_hash, existing.idempotency_key,
      existing.created_at, true;
    return;
  end if;

  select coalesce(max(candidate.version), 0) + 1 into next_version
  from public.activity_illustrations candidate
  where candidate.activity_id = target_activity_id;

  content_hash := public.activity_illustration_source_content_hash(target_activity_id);
  if content_hash is null then
    raise exception 'ACTIVITY_CONTENT_HASH_FAILED' using errcode = '22023';
  end if;

  insert into public.activity_illustrations (
    activity_id, version, status, generation_reason, idempotency_key,
    source_content_hash, created_by
  ) values (
    target_activity_id, next_version, 'generating', target_generation_reason,
    target_idempotency_key, content_hash, caller_id
  ) returning * into existing;

  return query select existing.id, existing.activity_id, existing.version,
    existing.status, existing.source_content_hash, existing.idempotency_key,
    existing.created_at, false;
end;
$$;

create or replace function public.mark_activity_illustration_draft(
  target_illustration_id uuid,
  target_draft_storage_path text,
  target_prompt_version text,
  target_prompt_hash text,
  target_prompt_snapshot text,
  target_provider text,
  target_model text,
  target_mime_type text,
  target_width integer,
  target_height integer,
  target_byte_size integer,
  target_sha256 text
)
returns public.activity_illustrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.activity_illustrations%rowtype;
begin
  update public.activity_illustrations illustration
  set status = 'draft',
      draft_storage_path = nullif(pg_catalog.btrim(target_draft_storage_path), ''),
      prompt_version = nullif(pg_catalog.btrim(target_prompt_version), ''),
      prompt_hash = pg_catalog.lower(target_prompt_hash),
      prompt_snapshot = target_prompt_snapshot,
      provider = nullif(pg_catalog.btrim(target_provider), ''),
      model = nullif(pg_catalog.btrim(target_model), ''),
      mime_type = nullif(pg_catalog.btrim(target_mime_type), ''),
      width = target_width,
      height = target_height,
      byte_size = target_byte_size,
      sha256 = pg_catalog.lower(target_sha256),
      generated_at = now(),
      error_code = null,
      error_message = null
  where illustration.id = target_illustration_id
    and illustration.status = 'generating'
  returning * into result;

  if result.id is null then
    raise exception 'ILLUSTRATION_NOT_GENERATING' using errcode = '55000';
  end if;
  return result;
end;
$$;

create or replace function public.mark_activity_illustration_failed(
  target_illustration_id uuid,
  target_error_code text,
  target_error_message text default null
)
returns public.activity_illustrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.activity_illustrations%rowtype;
begin
  update public.activity_illustrations illustration
  set status = 'failed',
      error_code = pg_catalog.upper(nullif(pg_catalog.btrim(target_error_code), '')),
      error_message = nullif(pg_catalog.left(pg_catalog.btrim(target_error_message), 500), '')
  where illustration.id = target_illustration_id
    and illustration.status = 'generating'
  returning * into result;

  if result.id is null then
    raise exception 'ILLUSTRATION_NOT_GENERATING' using errcode = '55000';
  end if;
  return result;
end;
$$;

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
  if expected_current_approved_illustration_id is not null
    and activity.approved_illustration_id is distinct from expected_current_approved_illustration_id then
    raise exception 'APPROVED_ILLUSTRATION_CHANGED' using errcode = '40001';
  end if;
  if target_approved_storage_path is null
    or target_approved_storage_path !~ ('^' || candidate.activity_id::text || '/v' || candidate.version::text || '-[0-9a-f]{8,64}[.]webp$') then
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

create or replace function public.reject_activity_illustration(
  target_illustration_id uuid,
  target_rejection_reason text
)
returns public.activity_illustrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  result public.activity_illustrations%rowtype;
  safe_reason text := nullif(pg_catalog.left(pg_catalog.btrim(target_rejection_reason), 500), '');
begin
  if caller_id is null or not public.is_app_admin() then
    raise exception 'ILLUSTRATION_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if safe_reason is null then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  update public.activity_illustrations illustration
  set status = 'rejected', rejection_reason = safe_reason,
      reviewed_by = caller_id, reviewed_at = now()
  where illustration.id = target_illustration_id
    and illustration.status = 'draft'
  returning * into result;

  if result.id is null then
    raise exception 'ILLUSTRATION_NOT_REJECTABLE' using errcode = '55000';
  end if;
  return result;
end;
$$;

revoke all on function public.reserve_activity_illustration_generation(uuid, text, uuid, uuid) from public, anon;
revoke all on function public.approve_activity_illustration(uuid, text, text, uuid) from public, anon;
revoke all on function public.reject_activity_illustration(uuid, text) from public, anon;
grant execute on function public.reserve_activity_illustration_generation(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.approve_activity_illustration(uuid, text, text, uuid) to authenticated;
grant execute on function public.reject_activity_illustration(uuid, text) to authenticated;

revoke all on function public.mark_activity_illustration_draft(uuid, text, text, text, text, text, text, text, integer, integer, integer, text) from public, anon, authenticated;
revoke all on function public.mark_activity_illustration_failed(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_activity_illustration_draft(uuid, text, text, text, text, text, text, text, integer, integer, integer, text) to service_role;
grant execute on function public.mark_activity_illustration_failed(uuid, text, text) to service_role;

-- Return signatures change, so PostgreSQL requires dropping and recreating the
-- functions. Argument signatures, authorization, pagination, and entitlement
-- rules remain unchanged.
drop function public.get_my_daily_adventures(uuid, date);
create function public.get_my_daily_adventures(target_child_id uuid, target_date date default null)
returns table(
  assignment_date date, "position" smallint, assignment_source text,
  assignment_count integer, incomplete boolean, id uuid, title text,
  category text, location text, "time" text, description text, try_this jsonb,
  why_it_helps text, materials jsonb, pro_only boolean, illustration_url text
)
language plpgsql security definer set search_path = '' as $$
declare
  effective_date date := coalesce(target_date, current_date);
  existing_count integer;
begin
  if auth.uid() is null or target_child_id is null
    or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;
  if effective_date < current_date - 1 or effective_date > current_date + 1 then
    raise exception 'DAILY_ADVENTURES_DATE_OUT_OF_RANGE' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_child_id::text || ':' || effective_date::text, 0));
  delete from public.daily_adventure_assignments assignment
  where assignment.child_id = target_child_id and assignment.assignment_date = effective_date
    and not exists (select 1 from public.activity_library activity where activity.id = assignment.library_activity_id and activity.status = 'approved');
  select count(*)::integer into existing_count from public.daily_adventure_assignments assignment
  where assignment.child_id = target_child_id and assignment.assignment_date = effective_date;
  if existing_count < 3 then
    with ranked_candidates as (
      select activity.id, row_number() over (order by exists (
        select 1 from public.daily_adventure_assignments recent
        where recent.child_id = target_child_id and recent.library_activity_id = activity.id
          and recent.assignment_date >= effective_date - 14 and recent.assignment_date < effective_date
      ), md5(target_child_id::text || ':' || effective_date::text || ':' || activity.id::text)) as candidate_position
      from public.activity_library activity
      where activity.status = 'approved' and not exists (
        select 1 from public.daily_adventure_assignments existing
        where existing.child_id = target_child_id and existing.assignment_date = effective_date
          and existing.library_activity_id = activity.id
      )
    ), selected_candidates as (
      select ranked.id, ranked.candidate_position from ranked_candidates ranked
      order by ranked.candidate_position limit (3 - existing_count)
    ), numbered_candidates as (
      select selected.id, row_number() over (order by selected.candidate_position) as sequence from selected_candidates selected
    ), missing_positions as (
      select positions.position, row_number() over (order by positions.position) as sequence
      from generate_series(1, 3) as positions(position)
      where not exists (select 1 from public.daily_adventure_assignments existing
        where existing.child_id = target_child_id and existing.assignment_date = effective_date
          and existing.position = positions.position)
    )
    insert into public.daily_adventure_assignments(child_id, assignment_date, position, library_activity_id, assignment_source)
    select target_child_id, effective_date, missing.position::smallint, candidate.id, 'daily_catalog'
    from numbered_candidates candidate join missing_positions missing using (sequence)
    on conflict do nothing;
  end if;
  select count(*)::integer into existing_count from public.daily_adventure_assignments assignment
  where assignment.child_id = target_child_id and assignment.assignment_date = effective_date;
  return query select assignment.assignment_date, assignment.position, assignment.assignment_source,
    existing_count, existing_count < 3, activity.id, activity.title, activity.category,
    activity.location, activity.time, activity.description, to_jsonb(activity.try_this),
    activity.why_it_helps, to_jsonb(activity.materials), activity.pro_only,
    illustration.approved_public_url
  from public.daily_adventure_assignments assignment
  join public.activity_library activity on activity.id = assignment.library_activity_id
  left join public.activity_illustrations illustration
    on illustration.id = activity.approved_illustration_id and illustration.status = 'approved'
  where assignment.child_id = target_child_id and assignment.assignment_date = effective_date
    and activity.status = 'approved' order by assignment.position;
end;
$$;

drop function public.search_my_activity_library(uuid, text, text, text, uuid, integer);
create function public.search_my_activity_library(
  target_child_id uuid, search_query text default null, category_filter text default null,
  after_title text default null, after_id uuid default null, page_size integer default 20
)
returns table(id uuid, title text, category text, location text, "time" text,
  description text, try_this jsonb, why_it_helps text, materials jsonb,
  pro_only boolean, illustration_url text)
language plpgsql stable security definer set search_path = '' as $$
declare
  normalized_query text := nullif(trim(search_query), '');
  safe_page_size integer := least(greatest(coalesce(page_size, 20), 1), 50);
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;
  if not public.daily_adventures_child_is_pro(target_child_id) then return; end if;
  if category_filter is not null and category_filter not in ('home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm') then
    raise exception 'INVALID_ACTIVITY_CATEGORY' using errcode = '22023';
  end if;
  return query select activity.id, activity.title, activity.category, activity.location,
    activity.time, activity.description, to_jsonb(activity.try_this), activity.why_it_helps,
    to_jsonb(activity.materials), activity.pro_only, illustration.approved_public_url
  from public.activity_library activity
  left join public.activity_illustrations illustration
    on illustration.id = activity.approved_illustration_id and illustration.status = 'approved'
  where activity.status = 'approved'
    and (category_filter is null or activity.category = category_filter)
    and (normalized_query is null or concat_ws(' ', activity.title, activity.description,
      activity.category, activity.location, activity.time, activity.materials::text,
      activity.try_this::text, activity.why_it_helps) ilike '%' || normalized_query || '%')
    and (after_title is null or after_id is null or (lower(activity.title), activity.id) > (lower(after_title), after_id))
  order by lower(activity.title), activity.id limit safe_page_size;
end;
$$;

drop function public.get_my_activity_detail(uuid, uuid);
create function public.get_my_activity_detail(target_child_id uuid, target_activity_id uuid)
returns table(id uuid, title text, category text, location text, "time" text,
  description text, try_this jsonb, why_it_helps text, materials jsonb,
  pro_only boolean, illustration_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;
  return query select activity.id, activity.title, activity.category, activity.location,
    activity.time, activity.description, to_jsonb(activity.try_this), activity.why_it_helps,
    to_jsonb(activity.materials), activity.pro_only, illustration.approved_public_url
  from public.activity_library activity
  left join public.activity_illustrations illustration
    on illustration.id = activity.approved_illustration_id and illustration.status = 'approved'
  where activity.id = target_activity_id and activity.status = 'approved' and (
    public.daily_adventures_child_is_pro(target_child_id)
    or exists (select 1 from public.daily_adventure_assignments assignment
      where assignment.child_id = target_child_id and assignment.library_activity_id = target_activity_id
        and assignment.assignment_date between current_date - 1 and current_date + 1)
    or exists (select 1 from public.saved_activities saved where saved.child_id = target_child_id
      and (saved.library_activity_id = target_activity_id or (saved.library_activity_id is null
        and lower(trim(saved.activity_name)) = lower(trim(activity.title))))
      and (coalesce(saved.is_saved, false) or coalesce(saved.is_favorite, false) or coalesce(saved.completed, false)))
  );
end;
$$;

drop function public.get_my_surprise_activity(uuid);
create function public.get_my_surprise_activity(target_child_id uuid)
returns table(id uuid, title text, category text, location text, "time" text,
  description text, try_this jsonb, why_it_helps text, materials jsonb,
  pro_only boolean, illustration_url text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;
  if not public.daily_adventures_child_is_pro(target_child_id) then return; end if;
  return query select activity.id, activity.title, activity.category, activity.location,
    activity.time, activity.description, to_jsonb(activity.try_this), activity.why_it_helps,
    to_jsonb(activity.materials), activity.pro_only, illustration.approved_public_url
  from public.activity_library activity
  left join public.activity_illustrations illustration
    on illustration.id = activity.approved_illustration_id and illustration.status = 'approved'
  where activity.status = 'approved'
  order by exists (select 1 from public.daily_adventure_assignments recent
    where recent.child_id = target_child_id and recent.library_activity_id = activity.id
      and recent.assignment_date >= current_date - 14),
    md5(auth.uid()::text || ':' || date_trunc('minute', clock_timestamp())::text || ':' || activity.id::text)
  limit 1;
end;
$$;

create or replace function public.get_my_saved_activity_snapshot(target_child_id uuid, target_saved_activity_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  snapshot jsonb;
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;
  select saved.activity_json || pg_catalog.jsonb_build_object(
    'illustration_url', illustration.approved_public_url
  ) into snapshot
  from public.saved_activities saved
  left join public.activity_library activity on activity.id = saved.library_activity_id
  left join public.activity_illustrations illustration
    on illustration.id = activity.approved_illustration_id and illustration.status = 'approved'
  where saved.id = target_saved_activity_id and saved.child_id = target_child_id
    and (coalesce(saved.is_saved, false) or coalesce(saved.is_favorite, false) or coalesce(saved.completed, false));
  return snapshot;
end;
$$;

revoke all on function public.get_my_daily_adventures(uuid, date) from public, anon;
revoke all on function public.search_my_activity_library(uuid, text, text, text, uuid, integer) from public, anon;
revoke all on function public.get_my_activity_detail(uuid, uuid) from public, anon;
revoke all on function public.get_my_saved_activity_snapshot(uuid, uuid) from public, anon;
revoke all on function public.get_my_surprise_activity(uuid) from public, anon;
grant execute on function public.get_my_daily_adventures(uuid, date) to authenticated;
grant execute on function public.search_my_activity_library(uuid, text, text, text, uuid, integer) to authenticated;
grant execute on function public.get_my_activity_detail(uuid, uuid) to authenticated;
grant execute on function public.get_my_saved_activity_snapshot(uuid, uuid) to authenticated;
grant execute on function public.get_my_surprise_activity(uuid) to authenticated;
grant execute on function public.get_my_daily_adventures(uuid, date) to service_role;
grant execute on function public.search_my_activity_library(uuid, text, text, text, uuid, integer) to service_role;
grant execute on function public.get_my_activity_detail(uuid, uuid) to service_role;
grant execute on function public.get_my_saved_activity_snapshot(uuid, uuid) to service_role;
grant execute on function public.get_my_surprise_activity(uuid) to service_role;

comment on table public.activity_illustrations is
  'Private illustration lifecycle metadata. Family access is only through approved-art fields in secure Daily Adventures RPCs.';
comment on function public.reserve_activity_illustration_generation(uuid, text, uuid, uuid) is
  'App-admin-only idempotent reservation for approved activity illustration generation.';

commit;
