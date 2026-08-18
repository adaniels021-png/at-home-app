create table public.child_safety_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  relationship text check (relationship is null or char_length(relationship) <= 100),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 254),
  is_primary boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 300),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(btrim(phone), '') is not null or nullif(btrim(email), '') is not null)
);

create index child_safety_emergency_contacts_child_idx
on public.child_safety_emergency_contacts(child_id, is_primary desc, created_at);

create unique index one_primary_safety_contact_per_child
on public.child_safety_emergency_contacts(child_id) where is_primary;

create trigger set_child_safety_emergency_contact_updated_at
before update on public.child_safety_emergency_contacts
for each row execute function public.set_child_safety_profile_updated_at();

alter table public.child_safety_emergency_contacts enable row level security;

create policy "Authorized caregivers can read safety contacts"
on public.child_safety_emergency_contacts for select to authenticated
using (public.can_access_child_safety(child_id));

create policy "Safety profile editors can create safety contacts"
on public.child_safety_emergency_contacts for insert to authenticated
with check (public.can_edit_child_safety(child_id) and created_by = auth.uid());

create policy "Safety profile editors can update safety contacts"
on public.child_safety_emergency_contacts for update to authenticated
using (public.can_edit_child_safety(child_id))
with check (public.can_edit_child_safety(child_id));

create policy "Safety profile editors can delete safety contacts"
on public.child_safety_emergency_contacts for delete to authenticated
using (public.can_edit_child_safety(child_id));

create or replace function public.set_primary_safety_contact(target_child_id uuid, target_contact_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.can_edit_child_safety(target_child_id) then raise exception 'Safety edit permission required'; end if;
  update public.child_safety_emergency_contacts set is_primary = false
    where child_id = target_child_id and is_primary and id <> target_contact_id;
  update public.child_safety_emergency_contacts set is_primary = true
    where child_id = target_child_id and id = target_contact_id;
end;
$$;

revoke all on function public.set_primary_safety_contact(uuid, uuid) from public;
grant execute on function public.set_primary_safety_contact(uuid, uuid) to authenticated;

create table public.child_safety_location_sources (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 100),
  source_type text not null check (source_type in ('phone','smartwatch','item_tracker','dedicated_gps','external_app','provider_service','future_companion_device','other')),
  provider_name text check (provider_name is null or char_length(provider_name) <= 100),
  device_name text check (device_name is null or char_length(device_name) <= 100),
  connection_mode text not null default 'manual' check (connection_mode in ('manual','external_launch','api','companion_device')),
  launch_uri text check (launch_uri is null or char_length(launch_uri) <= 500),
  web_url text check (web_url is null or char_length(web_url) <= 500),
  notes text check (notes is null or char_length(notes) <= 300),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (connection_mode in ('manual','external_launch'))
);

create index child_safety_location_sources_child_idx
on public.child_safety_location_sources(child_id, created_at);

create trigger set_child_safety_location_source_updated_at
before update on public.child_safety_location_sources
for each row execute function public.set_child_safety_profile_updated_at();

alter table public.child_safety_location_sources enable row level security;

create policy "Authorized caregivers can read safety location sources"
on public.child_safety_location_sources for select to authenticated
using (public.can_access_child_safety(child_id));

create policy "Safety profile editors can create safety location sources"
on public.child_safety_location_sources for insert to authenticated
with check (public.can_edit_child_safety(child_id) and created_by = auth.uid());

create policy "Safety profile editors can update safety location sources"
on public.child_safety_location_sources for update to authenticated
using (public.can_edit_child_safety(child_id))
with check (public.can_edit_child_safety(child_id));

create policy "Safety profile editors can delete safety location sources"
on public.child_safety_location_sources for delete to authenticated
using (public.can_edit_child_safety(child_id));
