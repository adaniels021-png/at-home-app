-- Daily Adventures 2.0 Phase A: backward-compatible secure server contracts.
-- This migration adds RPCs and normalized assignments without removing legacy
-- policies used by released clients. The RLS cutover is a separate migration.

begin;

do $$
declare
  invalid_library_categories text;
  invalid_queue_categories text;
begin
  select string_agg(distinct coalesce(category, '<NULL>'), ', ' order by coalesce(category, '<NULL>'))
  into invalid_library_categories
  from public.activity_library
  where category is null or category not in (
    'home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm'
  );

  if invalid_library_categories is not null then
    raise exception 'Invalid activity_library categories must be reviewed explicitly: %', invalid_library_categories;
  end if;

  select string_agg(distinct coalesce(category, '<NULL>'), ', ' order by coalesce(category, '<NULL>'))
  into invalid_queue_categories
  from public.activity_queue
  where category is null or category not in (
    'home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm'
  );

  if invalid_queue_categories is not null then
    raise exception 'Invalid activity_queue categories must be reviewed explicitly: %', invalid_queue_categories;
  end if;
end
$$;

alter table public.activity_library
  drop constraint if exists activity_library_category_canonical;
alter table public.activity_library
  add constraint activity_library_category_canonical
  check (category in ('home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm'));

alter table public.activity_queue
  drop constraint if exists activity_queue_category_canonical;
alter table public.activity_queue
  add constraint activity_queue_category_canonical
  check (category in ('home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm'));

create table if not exists public.daily_adventure_assignments (
  child_id uuid not null references public.children(id) on delete cascade,
  assignment_date date not null,
  position smallint not null check (position between 1 and 3),
  library_activity_id uuid not null references public.activity_library(id) on delete cascade,
  assignment_source text not null default 'daily_catalog'
    check (assignment_source in ('daily_catalog')),
  created_at timestamptz not null default now(),
  primary key (child_id, assignment_date, position),
  unique (child_id, assignment_date, library_activity_id)
);

create index if not exists daily_adventure_assignments_recent_child_idx
on public.daily_adventure_assignments(child_id, assignment_date desc);

alter table public.daily_adventure_assignments enable row level security;
revoke all on table public.daily_adventure_assignments from public, anon, authenticated;

alter table public.saved_activities
  add column if not exists library_activity_id uuid
  references public.activity_library(id) on delete set null;

create index if not exists saved_activities_child_library_idx
on public.saved_activities(child_id, library_activity_id)
where library_activity_id is not null;

-- Backfill only unambiguous exact-title matches. JSON snapshots remain intact.
update public.saved_activities saved
set library_activity_id = candidate.id
from public.activity_library candidate
where saved.library_activity_id is null
  and lower(trim(saved.activity_name)) = lower(trim(candidate.title))
  and (
    select count(*)
    from public.activity_library match
    where lower(trim(match.title)) = lower(trim(saved.activity_name))
  ) = 1;

create or replace function public.daily_adventures_child_is_pro(target_child_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entitlement record;
begin
  if auth.uid() is null or not public.has_child_access(target_child_id) then
    return false;
  end if;

  select * into entitlement
  from public.resolve_child_server_entitlement(target_child_id)
  limit 1;

  return coalesce(entitlement.authoritative, false)
    and coalesce(entitlement.is_pro, false)
    and entitlement.state in ('TRIAL', 'PRO');
end;
$$;

revoke all on function public.daily_adventures_child_is_pro(uuid) from public, anon, authenticated;

create or replace function public.get_my_daily_adventures(
  target_child_id uuid,
  target_date date default null
)
returns table(
  assignment_date date,
  position smallint,
  assignment_source text,
  assignment_count integer,
  incomplete boolean,
  id uuid,
  title text,
  category text,
  location text,
  time text,
  description text,
  try_this jsonb,
  why_it_helps text,
  materials jsonb,
  pro_only boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  effective_date date := coalesce(target_date, current_date);
  existing_count integer;
begin
  if auth.uid() is null or target_child_id is null
    or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;

  -- Accept the caller's local-calendar today while preventing date harvesting.
  if effective_date < current_date - 1 or effective_date > current_date + 1 then
    raise exception 'DAILY_ADVENTURES_DATE_OUT_OF_RANGE' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_child_id::text || ':' || effective_date::text, 0)
  );

  delete from public.daily_adventure_assignments assignment
  where assignment.child_id = target_child_id
    and assignment.assignment_date = effective_date
    and not exists (
      select 1 from public.activity_library activity
      where activity.id = assignment.library_activity_id
        and activity.status = 'approved'
    );

  select count(*)::integer into existing_count
  from public.daily_adventure_assignments assignment
  where assignment.child_id = target_child_id
    and assignment.assignment_date = effective_date;

  if existing_count < 3 then
    with ranked_candidates as (
      select
        activity.id,
        row_number() over (
          order by
            exists (
              select 1
              from public.daily_adventure_assignments recent
              where recent.child_id = target_child_id
                and recent.library_activity_id = activity.id
                and recent.assignment_date >= effective_date - 14
                and recent.assignment_date < effective_date
            ),
            md5(target_child_id::text || ':' || effective_date::text || ':' || activity.id::text)
        ) as candidate_position
      from public.activity_library activity
      where activity.status = 'approved'
        and not exists (
          select 1
          from public.daily_adventure_assignments existing
          where existing.child_id = target_child_id
            and existing.assignment_date = effective_date
            and existing.library_activity_id = activity.id
        )
    ), selected_candidates as (
      select id, candidate_position
      from ranked_candidates
      order by candidate_position
      limit (3 - existing_count)
    ), numbered_candidates as (
      select id, row_number() over (order by candidate_position) as sequence
      from selected_candidates
    ), missing_positions as (
      select position, row_number() over (order by position) as sequence
      from generate_series(1, 3) as positions(position)
      where not exists (
        select 1 from public.daily_adventure_assignments existing
        where existing.child_id = target_child_id
          and existing.assignment_date = effective_date
          and existing.position = position
      )
    )
    insert into public.daily_adventure_assignments (
      child_id, assignment_date, position, library_activity_id, assignment_source
    )
    select
      target_child_id,
      effective_date,
      missing.position::smallint,
      candidate.id,
      'daily_catalog'
    from numbered_candidates candidate
    join missing_positions missing using (sequence)
    on conflict do nothing;
  end if;

  select count(*)::integer into existing_count
  from public.daily_adventure_assignments assignment
  where assignment.child_id = target_child_id
    and assignment.assignment_date = effective_date;

  return query
  select
    assignment.assignment_date,
    assignment.position,
    assignment.assignment_source,
    existing_count,
    existing_count < 3,
    activity.id,
    activity.title,
    activity.category,
    activity.location,
    activity.time,
    activity.description,
    to_jsonb(activity.try_this),
    activity.why_it_helps,
    to_jsonb(activity.materials),
    activity.pro_only
  from public.daily_adventure_assignments assignment
  join public.activity_library activity
    on activity.id = assignment.library_activity_id
  where assignment.child_id = target_child_id
    and assignment.assignment_date = effective_date
    and activity.status = 'approved'
  order by assignment.position;
end;
$$;

create or replace function public.search_my_activity_library(
  target_child_id uuid,
  search_query text default null,
  category_filter text default null,
  after_title text default null,
  after_id uuid default null,
  page_size integer default 20
)
returns table(
  id uuid, title text, category text, location text, time text,
  description text, try_this jsonb, why_it_helps text, materials jsonb, pro_only boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(trim(search_query), '');
  safe_page_size integer := least(greatest(coalesce(page_size, 20), 1), 50);
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;

  if not public.daily_adventures_child_is_pro(target_child_id) then
    return;
  end if;

  if category_filter is not null and category_filter not in (
    'home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm'
  ) then
    raise exception 'INVALID_ACTIVITY_CATEGORY' using errcode = '22023';
  end if;

  return query
  select activity.id, activity.title, activity.category, activity.location,
    activity.time, activity.description, to_jsonb(activity.try_this),
    activity.why_it_helps, to_jsonb(activity.materials), activity.pro_only
  from public.activity_library activity
  where activity.status = 'approved'
    and (category_filter is null or activity.category = category_filter)
    and (
      normalized_query is null
      or concat_ws(' ', activity.title, activity.description, activity.category,
        activity.location, activity.time, activity.materials::text,
        activity.try_this::text, activity.why_it_helps)
        ilike '%' || normalized_query || '%'
    )
    and (
      after_title is null or after_id is null
      or (lower(activity.title), activity.id) > (lower(after_title), after_id)
    )
  order by lower(activity.title), activity.id
  limit safe_page_size;
end;
$$;

create or replace function public.get_my_activity_detail(
  target_child_id uuid,
  target_activity_id uuid
)
returns table(
  id uuid, title text, category text, location text, time text,
  description text, try_this jsonb, why_it_helps text, materials jsonb, pro_only boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;

  return query
  select activity.id, activity.title, activity.category, activity.location,
    activity.time, activity.description, to_jsonb(activity.try_this),
    activity.why_it_helps, to_jsonb(activity.materials), activity.pro_only
  from public.activity_library activity
  where activity.id = target_activity_id
    and activity.status = 'approved'
    and (
      public.daily_adventures_child_is_pro(target_child_id)
      or exists (
        select 1 from public.daily_adventure_assignments assignment
        where assignment.child_id = target_child_id
          and assignment.library_activity_id = target_activity_id
          and assignment.assignment_date between current_date - 1 and current_date + 1
      )
      or exists (
        select 1 from public.saved_activities saved
        where saved.child_id = target_child_id
          and (saved.library_activity_id = target_activity_id
            or (saved.library_activity_id is null
              and lower(trim(saved.activity_name)) = lower(trim(activity.title))))
          and (coalesce(saved.is_saved, false)
            or coalesce(saved.is_favorite, false)
            or coalesce(saved.completed, false))
      )
    );
end;
$$;

create or replace function public.set_my_activity_state(
  target_child_id uuid,
  target_activity_id uuid,
  saved_value boolean default null,
  favorite_value boolean default null,
  completed_value boolean default null,
  feedback_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity public.activity_library%rowtype;
  has_retained_access boolean;
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;

  if feedback_value is not null and feedback_value not in ('loved', 'good', 'not_today') then
    raise exception 'INVALID_ACTIVITY_FEEDBACK' using errcode = '22023';
  end if;

  select * into activity
  from public.activity_library candidate
  where candidate.id = target_activity_id and candidate.status = 'approved';

  if activity.id is null then
    raise exception 'ACTIVITY_NOT_AVAILABLE' using errcode = '42501';
  end if;

  select public.daily_adventures_child_is_pro(target_child_id)
    or exists (
      select 1 from public.daily_adventure_assignments assignment
      where assignment.child_id = target_child_id
        and assignment.library_activity_id = target_activity_id
        and assignment.assignment_date between current_date - 1 and current_date + 1
    )
    or exists (
      select 1 from public.saved_activities saved
      where saved.child_id = target_child_id
        and (saved.library_activity_id = target_activity_id
          or (saved.library_activity_id is null
            and lower(trim(saved.activity_name)) = lower(trim(activity.title))))
        and (coalesce(saved.is_saved, false)
          or coalesce(saved.is_favorite, false)
          or coalesce(saved.completed, false))
    )
  into has_retained_access;

  if not has_retained_access then
    raise exception 'ACTIVITY_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  insert into public.saved_activities (
    child_id, activity_date, activity_name, activity_json,
    library_activity_id, is_saved, is_favorite, completed, feedback
  ) values (
    target_child_id, current_date, activity.title,
    jsonb_build_object(
      'id', activity.id, 'name', activity.title, 'title', activity.title,
      'category', activity.category, 'location', activity.location,
      'time', activity.time, 'description', activity.description,
      'try_this', activity.try_this, 'why_it_helps', activity.why_it_helps,
      'materials', activity.materials, 'pro_only', activity.pro_only,
      'source', 'library', 'library_activity_id', activity.id
    ),
    activity.id, coalesce(saved_value, false), coalesce(favorite_value, false),
    coalesce(completed_value, false), feedback_value
  )
  on conflict (child_id, activity_date, activity_name) do update set
    library_activity_id = excluded.library_activity_id,
    activity_json = excluded.activity_json,
    is_saved = coalesce(saved_value, saved_activities.is_saved),
    is_favorite = coalesce(favorite_value, saved_activities.is_favorite),
    completed = coalesce(completed_value, saved_activities.completed),
    feedback = coalesce(feedback_value, saved_activities.feedback);

  return jsonb_build_object('success', true, 'activity_id', activity.id);
end;
$$;

create or replace function public.get_my_saved_activity_snapshot(
  target_child_id uuid,
  target_saved_activity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;

  select saved.activity_json into snapshot
  from public.saved_activities saved
  where saved.id = target_saved_activity_id
    and saved.child_id = target_child_id
    and (coalesce(saved.is_saved, false)
      or coalesce(saved.is_favorite, false)
      or coalesce(saved.completed, false));

  return snapshot;
end;
$$;

create or replace function public.get_my_surprise_activity(target_child_id uuid)
returns table(
  id uuid, title text, category text, location text, time text,
  description text, try_this jsonb, why_it_helps text, materials jsonb, pro_only boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_child_permission(target_child_id, 'view_learning_content') then
    raise exception 'DAILY_ADVENTURES_UNAUTHORIZED' using errcode = '42501';
  end if;

  if not public.daily_adventures_child_is_pro(target_child_id) then
    return;
  end if;

  return query
  select activity.id, activity.title, activity.category, activity.location,
    activity.time, activity.description, to_jsonb(activity.try_this),
    activity.why_it_helps, to_jsonb(activity.materials), activity.pro_only
  from public.activity_library activity
  where activity.status = 'approved'
  order by
    exists (
      select 1 from public.daily_adventure_assignments recent
      where recent.child_id = target_child_id
        and recent.library_activity_id = activity.id
        and recent.assignment_date >= current_date - 14
    ),
    md5(auth.uid()::text || ':' || date_trunc('minute', clock_timestamp())::text || ':' || activity.id::text)
  limit 1;
end;
$$;

revoke all on function public.get_my_daily_adventures(uuid, date) from public, anon;
revoke all on function public.search_my_activity_library(uuid, text, text, text, uuid, integer) from public, anon;
revoke all on function public.get_my_activity_detail(uuid, uuid) from public, anon;
revoke all on function public.set_my_activity_state(uuid, uuid, boolean, boolean, boolean, text) from public, anon;
revoke all on function public.get_my_saved_activity_snapshot(uuid, uuid) from public, anon;
revoke all on function public.get_my_surprise_activity(uuid) from public, anon;

grant execute on function public.get_my_daily_adventures(uuid, date) to authenticated;
grant execute on function public.search_my_activity_library(uuid, text, text, text, uuid, integer) to authenticated;
grant execute on function public.get_my_activity_detail(uuid, uuid) to authenticated;
grant execute on function public.set_my_activity_state(uuid, uuid, boolean, boolean, boolean, text) to authenticated;
grant execute on function public.get_my_saved_activity_snapshot(uuid, uuid) to authenticated;
grant execute on function public.get_my_surprise_activity(uuid) to authenticated;

comment on table public.daily_adventure_assignments is
  'Server-created stable daily activity grants. Clients have no direct table access.';
comment on function public.get_my_daily_adventures(uuid, date) is
  'Returns or creates up to three stable approved assignments for an authorized child/date.';

commit;
