-- Safety architecture rule: every child-specific Safety feature must define
-- data owner, view permission, edit permission, sync behavior, and whether its
-- data is permanent child information or temporary incident information.

alter table public.child_safety_profiles
  add column if not exists communication_other text,
  add column if not exists can_share_name text check (
    can_share_name is null or can_share_name in ('yes', 'sometimes', 'not-usually', 'unknown')
  ),
  add column if not exists communication_supports_other text,
  add column if not exists approach_guidance_other text,
  add column if not exists wandering_patterns_other text,
  add column if not exists wandering_destinations text[] not null default '{}',
  add column if not exists wandering_destinations_other text,
  add column if not exists safety_concerns_other text,
  add column if not exists sensory_challenges_other text,
  add column if not exists regulation_supports_other text;

create table public.child_safety_permissions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  can_view_safety_profile boolean not null default false,
  can_edit_safety_profile boolean not null default false,
  can_use_safety_mode boolean not null default false,
  can_participate_in_safety_incident boolean not null default false,
  receive_safety_alerts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, caregiver_user_id)
);

create index child_safety_permissions_caregiver_idx
on public.child_safety_permissions(caregiver_user_id, child_id);

alter table public.child_safety_permissions enable row level security;

create policy "Owners can manage child safety permissions"
on public.child_safety_permissions
for all
to authenticated
using (
  exists (
    select 1 from public.children child
    where child.id = child_safety_permissions.child_id
      and child.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.children child
    where child.id = child_safety_permissions.child_id
      and child.parent_id = auth.uid()
  )
);

create policy "Caregivers can view their own safety permissions"
on public.child_safety_permissions
for select
to authenticated
using (caregiver_user_id = auth.uid());

create or replace function public.can_access_child_safety(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children child
    where child.id = target_child_id and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    left join public.child_safety_permissions permission
      on permission.child_id = caregiver.child_id
      and permission.caregiver_user_id = caregiver.caregiver_user_id
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
      and coalesce(
        permission.can_view_safety_profile,
        caregiver.role in ('parent', 'caregiver')
      )
  );
$$;

create or replace function public.can_edit_child_safety(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children child
    where child.id = target_child_id and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    join public.child_safety_permissions permission
      on permission.child_id = caregiver.child_id
      and permission.caregiver_user_id = caregiver.caregiver_user_id
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
      and permission.can_edit_safety_profile
  );
$$;

create or replace function public.can_use_child_safety_mode(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children child
    where child.id = target_child_id and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    left join public.child_safety_permissions permission
      on permission.child_id = caregiver.child_id
      and permission.caregiver_user_id = caregiver.caregiver_user_id
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
      and coalesce(permission.can_use_safety_mode, caregiver.role in ('parent', 'caregiver'))
  );
$$;

create or replace function public.can_participate_child_safety_incident(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children child
    where child.id = target_child_id and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    left join public.child_safety_permissions permission
      on permission.child_id = caregiver.child_id
      and permission.caregiver_user_id = caregiver.caregiver_user_id
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
      and coalesce(
        permission.can_participate_in_safety_incident,
        caregiver.role = 'parent'
      )
  );
$$;

create or replace function public.should_receive_child_safety_alerts(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children child
    where child.id = target_child_id and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    left join public.child_safety_permissions permission
      on permission.child_id = caregiver.child_id
      and permission.caregiver_user_id = caregiver.caregiver_user_id
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
      and coalesce(permission.receive_safety_alerts, caregiver.role = 'parent')
  );
$$;

revoke all on function public.can_use_child_safety_mode(uuid) from public;
revoke all on function public.can_participate_child_safety_incident(uuid) from public;
grant execute on function public.can_use_child_safety_mode(uuid) to authenticated;
grant execute on function public.can_participate_child_safety_incident(uuid) to authenticated;
revoke all on function public.should_receive_child_safety_alerts(uuid) from public;
grant execute on function public.should_receive_child_safety_alerts(uuid) to authenticated;

create table public.safety_emergency_incidents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  incident_type text not null check (
    incident_type in ('elopement', 'aggression', 'self_injury', 'medical', 'other')
  ),
  status text not null default 'active' check (status in ('active', 'resolved')),
  started_at timestamptz not null default now(),
  started_by_user_id uuid not null references auth.users(id),
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id),
  current_clothing text,
  last_seen_time timestamptz,
  last_seen_place_label text,
  last_seen_latitude double precision,
  last_seen_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_elopement_incident_per_child
on public.safety_emergency_incidents(child_id)
where incident_type = 'elopement' and status = 'active';

create index safety_emergency_incidents_child_started_idx
on public.safety_emergency_incidents(child_id, started_at desc);

create trigger set_safety_emergency_incident_updated_at
before update on public.safety_emergency_incidents
for each row execute function public.set_child_safety_profile_updated_at();

alter table public.safety_emergency_incidents enable row level security;

create policy "Incident participants can read safety incidents"
on public.safety_emergency_incidents
for select
to authenticated
using (public.can_participate_child_safety_incident(child_id));

create policy "Incident participants can start safety incidents"
on public.safety_emergency_incidents
for insert
to authenticated
with check (
  public.can_participate_child_safety_incident(child_id)
  and started_by_user_id = auth.uid()
);

create policy "Incident participants can update safety incidents"
on public.safety_emergency_incidents
for update
to authenticated
using (public.can_participate_child_safety_incident(child_id))
with check (public.can_participate_child_safety_incident(child_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'safety_emergency_incidents'
  ) then
    alter publication supabase_realtime add table public.safety_emergency_incidents;
  end if;
end;
$$;
