-- Resumable, child-safe account deletion. Relational cleanup is transactional;
-- external cleanup is completed by the delete-account Edge Function.

create table public.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stage text not null default 'REQUESTED' check (stage in (
    'REQUESTED',
    'RELATIONAL_CLEANUP_COMPLETE',
    'STORAGE_COMPLETE',
    'REVENUECAT_COMPLETE',
    'AUTH_DELETE_COMPLETE',
    'FAILED_RETRYABLE'
  )),
  resume_stage text,
  attempt_count integer not null default 0,
  last_error_code text,
  processing_token uuid,
  lease_expires_at timestamptz,
  owned_child_count integer not null default 0,
  caregiver_membership_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index account_deletion_jobs_one_active_user
on public.account_deletion_jobs(user_id)
where stage <> 'AUTH_DELETE_COMPLETE';

create table public.account_deletion_storage_manifest (
  id uuid primary key default gen_random_uuid(),
  deletion_job_id uuid not null references public.account_deletion_jobs(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  intended_action text not null default 'DELETE' check (intended_action = 'DELETE'),
  ownership_reason text not null check (ownership_reason in (
    'OWNED_CHILD_SAFETY_PHOTO',
    'OWNED_CHILD_PECS_IMAGE',
    'OWNED_CHILD_ROUTINE_IMAGE'
  )),
  state text not null default 'PENDING' check (state in ('PENDING', 'COMPLETE')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(deletion_job_id, bucket, object_path)
);

alter table public.account_deletion_jobs enable row level security;
alter table public.account_deletion_storage_manifest enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;
revoke all on public.account_deletion_storage_manifest from public, anon, authenticated;
grant select, insert, update, delete on public.account_deletion_jobs to service_role;
grant select, insert, update, delete on public.account_deletion_storage_manifest to service_role;

-- Contributor/audit identity must not prevent Auth deletion. The underlying
-- child-owned record survives when its child belongs to another owner.
alter table public.activity_logs drop constraint activity_logs_user_id_fkey;
alter table public.activity_logs add constraint activity_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.child_caregiver_permission_overrides alter column granted_by drop not null;
alter table public.child_caregiver_permission_overrides drop constraint child_caregiver_permission_overrides_granted_by_fkey;
alter table public.child_caregiver_permission_overrides add constraint child_caregiver_permission_overrides_granted_by_fkey
  foreign key (granted_by) references auth.users(id) on delete set null;

alter table public.child_safety_emergency_contacts alter column created_by drop not null;
alter table public.child_safety_emergency_contacts drop constraint child_safety_emergency_contacts_created_by_fkey;
alter table public.child_safety_emergency_contacts add constraint child_safety_emergency_contacts_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.child_safety_location_sources alter column created_by drop not null;
alter table public.child_safety_location_sources drop constraint child_safety_location_sources_created_by_fkey;
alter table public.child_safety_location_sources add constraint child_safety_location_sources_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.routine_logs drop constraint routine_logs_user_id_fkey;
alter table public.routine_logs add constraint routine_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.pecs_cards alter column user_id drop not null;
alter table public.calm_tool_logs alter column user_id drop not null;
alter table public.lesson_streaks alter column user_id drop not null;

alter table public.safety_emergency_incidents alter column started_by_user_id drop not null;
alter table public.safety_emergency_incidents drop constraint safety_emergency_incidents_started_by_user_id_fkey;
alter table public.safety_emergency_incidents add constraint safety_emergency_incidents_started_by_user_id_fkey
  foreign key (started_by_user_id) references auth.users(id) on delete set null;
alter table public.safety_emergency_incidents drop constraint safety_emergency_incidents_resolved_by_user_id_fkey;
alter table public.safety_emergency_incidents add constraint safety_emergency_incidents_resolved_by_user_id_fkey
  foreign key (resolved_by_user_id) references auth.users(id) on delete set null;

alter table public.safety_incident_search_checks alter column checked_by_user_id drop not null;
alter table public.safety_incident_search_checks drop constraint safety_incident_search_checks_checked_by_user_id_fkey;
alter table public.safety_incident_search_checks add constraint safety_incident_search_checks_checked_by_user_id_fkey
  foreign key (checked_by_user_id) references auth.users(id) on delete set null;

alter table public.safety_incident_sightings alter column reported_by_user_id drop not null;
alter table public.safety_incident_sightings drop constraint safety_incident_sightings_reported_by_user_id_fkey;
alter table public.safety_incident_sightings add constraint safety_incident_sightings_reported_by_user_id_fkey
  foreign key (reported_by_user_id) references auth.users(id) on delete set null;

alter table public.recommendation_activation_audit drop constraint recommendation_activation_audit_changed_by_fkey;
alter table public.recommendation_activation_audit add constraint recommendation_activation_audit_changed_by_fkey
  foreign key (changed_by) references auth.users(id) on delete set null;
alter table public.recommendation_activation_control drop constraint recommendation_activation_control_updated_by_fkey;
alter table public.recommendation_activation_control add constraint recommendation_activation_control_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.lesson_personalization_metadata_history alter column reviewer_user_id drop not null;
alter table public.lesson_personalization_metadata_history drop constraint lesson_personalization_metadata_history_reviewer_user_id_fkey;
alter table public.lesson_personalization_metadata_history add constraint lesson_personalization_metadata_history_reviewer_user_id_fkey
  foreign key (reviewer_user_id) references auth.users(id) on delete set null;

alter table public.lesson_personalization_review_decision_history alter column reviewer_user_id drop not null;
alter table public.lesson_personalization_review_decision_history drop constraint lesson_personalization_review_decision_hi_reviewer_user_id_fkey;
alter table public.lesson_personalization_review_decision_history add constraint lesson_personalization_review_decision_hi_reviewer_user_id_fkey
  foreign key (reviewer_user_id) references auth.users(id) on delete set null;

alter table public.child_profiles drop constraint child_profiles_parent_id_fkey;
alter table public.child_profiles add constraint child_profiles_parent_id_fkey
  foreign key (parent_id) references auth.users(id) on delete cascade;

alter table public.ai_activities drop constraint ai_activities_user_id_fkey;
alter table public.ai_activities add constraint ai_activities_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create or replace function public.set_custom_routines_user_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null
     and coalesce(current_setting('app.account_deletion_cleanup', true), '') <> 'on' then
    select child.parent_id into new.user_id
    from public.children child where child.id = new.child_id;
  end if;
  return new;
end;
$$;

create or replace function public.protect_safety_incident_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.account_deletion_cleanup', true), '') = 'on' then
    new.id := old.id;
    new.child_id := old.child_id;
    new.incident_type := old.incident_type;
    new.started_at := old.started_at;
    new.created_at := old.created_at;
    return new;
  end if;
  if old.status = 'resolved' then
    raise exception 'Resolved Safety incidents cannot be changed';
  end if;
  new.id := old.id;
  new.child_id := old.child_id;
  new.incident_type := old.incident_type;
  new.started_at := old.started_at;
  new.started_by_user_id := old.started_by_user_id;
  new.created_at := old.created_at;
  if new.status = 'resolved' then
    new.resolved_at := now();
    new.resolved_by_user_id := auth.uid();
  else
    new.resolved_at := null;
    new.resolved_by_user_id := null;
  end if;
  return new;
end;
$$;

-- Return deletion impact without exposing child or caregiver identity.
create or replace function public.get_my_account_deletion_impact()
returns table(
  account_role text,
  owned_child_count integer,
  caregiver_membership_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  owned_count integer;
  caregiver_count integer;
begin
  if caller is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select count(*)::integer into owned_count
  from public.children where parent_id = caller;

  select count(*)::integer into caregiver_count
  from public.child_caregivers
  where caregiver_user_id = caller and owner_user_id <> caller;

  return query select
    case
      when owned_count > 0 and caregiver_count > 0 then 'MIXED'
      when owned_count > 0 then 'OWNER'
      else 'CAREGIVER_ONLY'
    end,
    owned_count,
    caregiver_count;
end;
$$;

revoke all on function public.get_my_account_deletion_impact() from public, anon;
grant execute on function public.get_my_account_deletion_impact() to authenticated;

create or replace function public.prepare_my_account_deletion()
returns table(
  job_id uuid,
  stage text,
  account_role text,
  owned_child_count integer,
  caregiver_membership_count integer,
  storage_object_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  deletion_job public.account_deletion_jobs%rowtype;
  owned_count integer := 0;
  caregiver_count integer := 0;
  object_count integer := 0;
  relation_record record;
begin
  if caller is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller::text, 741031));

  select deletion_candidate.* into deletion_job
  from public.account_deletion_jobs deletion_candidate
  where deletion_candidate.user_id = caller
    and deletion_candidate.stage <> 'AUTH_DELETE_COMPLETE'
  order by deletion_candidate.created_at desc
  limit 1
  for update;

  if deletion_job.id is not null and deletion_job.stage in (
    'RELATIONAL_CLEANUP_COMPLETE', 'STORAGE_COMPLETE',
    'REVENUECAT_COMPLETE', 'FAILED_RETRYABLE'
  ) then
    select count(*)::integer into object_count
    from public.account_deletion_storage_manifest
    where deletion_job_id = deletion_job.id;
    return query select deletion_job.id, deletion_job.stage,
      case when deletion_job.owned_child_count > 0 and deletion_job.caregiver_membership_count > 0 then 'MIXED'
           when deletion_job.owned_child_count > 0 then 'OWNER' else 'CAREGIVER_ONLY' end,
      deletion_job.owned_child_count, deletion_job.caregiver_membership_count, object_count;
    return;
  end if;

  if deletion_job.id is null then
    insert into public.account_deletion_jobs(user_id)
    values (caller) returning * into deletion_job;
  end if;

  update public.account_deletion_jobs
  set attempt_count = attempt_count + 1, last_error_code = null,
      resume_stage = null, updated_at = now()
  where id = deletion_job.id;

  select email into caller_email from auth.users where id = caller;
  select count(*)::integer into owned_count from public.children where parent_id = caller;
  select count(*)::integer into caregiver_count
  from public.child_caregivers
  where caregiver_user_id = caller and owner_user_id <> caller;

  perform set_config('app.account_deletion_cleanup', 'on', true);

  -- Exact Storage names come only from persisted object-path fields. URL-derived
  -- names are accepted only for the two known buckets and are matched exactly.
  insert into public.account_deletion_storage_manifest
    (deletion_job_id, bucket, object_path, ownership_reason)
  select deletion_job.id, 'child-safety-photos', profile.photo_path,
         'OWNED_CHILD_SAFETY_PHOTO'
  from public.child_safety_profiles profile
  join public.children child on child.id = profile.child_id
  join storage.objects object on object.bucket_id = 'child-safety-photos'
                             and object.name = profile.photo_path
  where child.parent_id = caller and nullif(profile.photo_path, '') is not null
  on conflict do nothing;

  insert into public.account_deletion_storage_manifest
    (deletion_job_id, bucket, object_path, ownership_reason)
  select distinct deletion_job.id, 'pecs-images', object.name,
         'OWNED_CHILD_PECS_IMAGE'
  from public.pecs_cards card
  join public.children child on child.id = card.child_id
  join storage.objects object on object.bucket_id = 'pecs-images'
    and card.image_url like '%' || '/pecs-images/' || object.name
  where child.parent_id = caller and card.is_custom and card.image_url is not null
  on conflict do nothing;

  insert into public.account_deletion_storage_manifest
    (deletion_job_id, bucket, object_path, ownership_reason)
  select distinct deletion_job.id, 'pecs-images', object.name,
         'OWNED_CHILD_ROUTINE_IMAGE'
  from public.custom_routines routine
  join public.children child on child.id = routine.child_id
  join storage.objects object on object.bucket_id = 'pecs-images'
    and routine.image_url like '%' || '/pecs-images/' || object.name
  where child.parent_id = caller and routine.is_custom_image and routine.image_url is not null
  on conflict do nothing;

  -- Preserve records about other owners' children, but remove the departing
  -- contributor's identity before membership removal.
  update public.activity_logs log set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = log.child_id and child.parent_id <> caller
  );
  delete from public.activity_logs where user_id = caller and child_id is null;
  update public.ai_sessions session_record set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = session_record.child_id and child.parent_id <> caller
  );
  delete from public.ai_sessions where user_id = caller and child_id is null;
  update public.calm_tool_logs log set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = log.child_id and child.parent_id <> caller
  );
  delete from public.calm_tool_logs where user_id = caller and child_id is null;
  update public.custom_routines routine set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = routine.child_id and child.parent_id <> caller
  );
  update public.daily_lesson_instances lesson set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = lesson.child_id and child.parent_id <> caller
  );
  update public.lesson_queue lesson set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = lesson.child_id and child.parent_id <> caller
  );
  update public.lesson_streaks streak set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = streak.child_id and child.parent_id <> caller
  );
  update public.notification_preferences preference set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = preference.child_id and child.parent_id <> caller
  );
  update public.parent_support_plans plan set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = plan.child_id and child.parent_id <> caller
  );
  delete from public.parent_support_plans where user_id = caller and child_id is null;
  update public.pecs_cards card set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = card.child_id and child.parent_id <> caller
  );
  update public.routine_logs log set user_id = null
  where user_id = caller and exists (
    select 1 from public.children child
    where child.id = log.child_id and child.parent_id <> caller
  );
  update public.child_safety_emergency_contacts contact set created_by = null
  where created_by = caller and exists (
    select 1 from public.children child
    where child.id = contact.child_id and child.parent_id <> caller
  );
  update public.child_safety_location_sources source set created_by = null
  where created_by = caller and exists (
    select 1 from public.children child
    where child.id = source.child_id and child.parent_id <> caller
  );
  update public.safety_emergency_incidents incident
  set started_by_user_id = case when started_by_user_id = caller then null else started_by_user_id end,
      resolved_by_user_id = case when resolved_by_user_id = caller then null else resolved_by_user_id end
  where (started_by_user_id = caller or resolved_by_user_id = caller)
    and exists (select 1 from public.children child
                where child.id = incident.child_id and child.parent_id <> caller);
  update public.safety_incident_search_checks check_record set checked_by_user_id = null
  where checked_by_user_id = caller and exists (
    select 1 from public.safety_emergency_incidents incident
    join public.children child on child.id = incident.child_id
    where incident.id = check_record.incident_id and child.parent_id <> caller
  );
  update public.safety_incident_sightings sighting set reported_by_user_id = null
  where reported_by_user_id = caller and exists (
    select 1 from public.safety_emergency_incidents incident
    join public.children child on child.id = incident.child_id
    where incident.id = sighting.incident_id and child.parent_id <> caller
  );

  delete from public.child_caregiver_permission_overrides where caregiver_user_id = caller;
  update public.child_caregiver_permission_overrides set granted_by = null where granted_by = caller;
  delete from public.child_safety_permissions where caregiver_user_id = caller;
  delete from public.child_caregivers where caregiver_user_id = caller and owner_user_id <> caller;
  delete from public.caregiver_invites
  where caller_email is not null and lower(invited_email) = lower(caller_email);

  -- Delete account-owned community/personal data. Child-owned rows for another
  -- owner were preserved above; owned-child rows are removed with the child.
  delete from public.parent_win_hidden_posts where user_id = caller;
  delete from public.parent_win_reactions where user_id = caller;
  delete from public.parent_win_reports where user_id = caller;
  delete from public.parent_win_posts where user_id = caller;
  delete from public.ai_activities where user_id = caller;
  delete from public.pairing_sessions where user_id = caller;
  delete from public.parent_sessions where parent_id = caller;
  delete from public.skills where user_id = caller;
  delete from public.user_subscription_status where user_id = caller;

  -- Every current public child_id relation represents data whose subject is the
  -- child. This schema-driven pass removes owned-child rows, including tables
  -- that predate complete FK coverage, before deleting the owned children.
  for relation_record in
    select column_info.table_schema, column_info.table_name
    from information_schema.columns column_info
    join information_schema.tables table_info
      on table_info.table_schema = column_info.table_schema
     and table_info.table_name = column_info.table_name
    where column_info.table_schema = 'public'
      and column_info.column_name = 'child_id'
      and table_info.table_type = 'BASE TABLE'
      and column_info.table_name <> 'children'
  loop
    execute format(
      'delete from %I.%I where child_id in (select id from public.children where parent_id = $1)',
      relation_record.table_schema, relation_record.table_name
    ) using caller;
  end loop;

  delete from public.children where parent_id = caller;
  delete from public.child_profiles where parent_id = caller;
  delete from public.profiles where id = caller;

  select count(*)::integer into object_count
  from public.account_deletion_storage_manifest
  where deletion_job_id = deletion_job.id;

  update public.account_deletion_jobs
  set stage = 'RELATIONAL_CLEANUP_COMPLETE', resume_stage = null,
      owned_child_count = owned_count,
      caregiver_membership_count = caregiver_count,
      updated_at = now()
  where id = deletion_job.id;

  return query select deletion_job.id, 'RELATIONAL_CLEANUP_COMPLETE'::text,
    case when owned_count > 0 and caregiver_count > 0 then 'MIXED'
         when owned_count > 0 then 'OWNER' else 'CAREGIVER_ONLY' end,
    owned_count, caregiver_count, object_count;
end;
$$;

revoke all on function public.prepare_my_account_deletion() from public, anon;
grant execute on function public.prepare_my_account_deletion() to authenticated;
