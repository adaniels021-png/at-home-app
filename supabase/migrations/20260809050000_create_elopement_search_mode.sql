-- Phase 8D temporary incident data. Permanent child preparedness remains in
-- child_safety_profiles and is governed independently.

alter table public.safety_emergency_incidents
  add constraint safety_incident_current_clothing_length
    check (current_clothing is null or char_length(current_clothing) <= 300),
  add constraint safety_incident_last_seen_place_length
    check (last_seen_place_label is null or char_length(last_seen_place_label) <= 200);

create table public.safety_incident_search_checks (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.safety_emergency_incidents(id) on delete cascade,
  place_key text not null,
  place_label text not null,
  checked_at timestamptz not null default now(),
  checked_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (incident_id, place_key)
);

create index safety_incident_search_checks_incident_idx
on public.safety_incident_search_checks(incident_id, checked_at desc);

alter table public.safety_incident_search_checks enable row level security;

create policy "Incident participants can read search checks"
on public.safety_incident_search_checks for select to authenticated
using (
  exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_search_checks.incident_id
      and public.can_participate_child_safety_incident(incident.child_id)
  )
);

create policy "Incident participants can add search checks"
on public.safety_incident_search_checks for insert to authenticated
with check (
  checked_by_user_id = auth.uid()
  and exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_search_checks.incident_id
      and incident.status = 'active'
      and public.can_participate_child_safety_incident(incident.child_id)
  )
);

create policy "Incident participants can remove search checks"
on public.safety_incident_search_checks for delete to authenticated
using (
  exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_search_checks.incident_id
      and incident.status = 'active'
      and public.can_participate_child_safety_incident(incident.child_id)
  )
);

create policy "Incident participants can update search checks"
on public.safety_incident_search_checks for update to authenticated
using (
  exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_search_checks.incident_id
      and incident.status = 'active'
      and public.can_participate_child_safety_incident(incident.child_id)
  )
)
with check (
  checked_by_user_id = auth.uid()
  and exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_search_checks.incident_id
      and incident.status = 'active'
      and public.can_participate_child_safety_incident(incident.child_id)
  )
);

create table public.safety_incident_sightings (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.safety_emergency_incidents(id) on delete cascade,
  reported_at timestamptz not null default now(),
  reported_by_user_id uuid not null references auth.users(id),
  sighting_time timestamptz not null,
  place_label text not null check (char_length(place_label) between 1 and 200),
  latitude double precision,
  longitude double precision,
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now()
);

create index safety_incident_sightings_incident_time_idx
on public.safety_incident_sightings(incident_id, sighting_time desc);

alter table public.safety_incident_sightings enable row level security;

alter table public.safety_incident_search_checks replica identity full;
alter table public.safety_incident_sightings replica identity full;

create policy "Incident participants can read sightings"
on public.safety_incident_sightings for select to authenticated
using (
  exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_sightings.incident_id
      and public.can_participate_child_safety_incident(incident.child_id)
  )
);

create or replace function public.protect_safety_incident_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

create trigger protect_safety_incident_identity
before update on public.safety_emergency_incidents
for each row execute function public.protect_safety_incident_identity();

create policy "Incident participants can report sightings"
on public.safety_incident_sightings for insert to authenticated
with check (
  reported_by_user_id = auth.uid()
  and exists (
    select 1 from public.safety_emergency_incidents incident
    where incident.id = safety_incident_sightings.incident_id
      and incident.status = 'active'
      and public.can_participate_child_safety_incident(incident.child_id)
  )
);

create or replace function public.resolve_safety_incident(target_incident_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_child_id uuid;
begin
  select child_id into target_child_id
  from public.safety_emergency_incidents
  where id = target_incident_id and status = 'active'
  for update;

  if target_child_id is null or not public.can_participate_child_safety_incident(target_child_id) then
    raise exception 'Safety incident not found or access denied';
  end if;

  update public.safety_emergency_incidents
  set status = 'resolved', resolved_at = now(), resolved_by_user_id = auth.uid()
  where id = target_incident_id and status = 'active';
end;
$$;

revoke all on function public.resolve_safety_incident(uuid) from public;
grant execute on function public.resolve_safety_incident(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'safety_incident_search_checks'
  ) then
    alter publication supabase_realtime add table public.safety_incident_search_checks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'safety_incident_sightings'
  ) then
    alter publication supabase_realtime add table public.safety_incident_sightings;
  end if;
end;
$$;
