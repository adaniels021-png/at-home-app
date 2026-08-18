create or replace function public.can_access_child_safety(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children child
    where child.id = target_child_id
      and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
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
    select 1
    from public.children child
    where child.id = target_child_id
      and child.parent_id = auth.uid()
  ) or exists (
    select 1
    from public.child_caregivers caregiver
    where caregiver.child_id = target_child_id
      and caregiver.caregiver_user_id = auth.uid()
      and caregiver.status = 'accepted'
      and caregiver.role = 'parent'
  );
$$;

revoke all on function public.can_access_child_safety(uuid) from public;
revoke all on function public.can_edit_child_safety(uuid) from public;
grant execute on function public.can_access_child_safety(uuid) to authenticated;
grant execute on function public.can_edit_child_safety(uuid) to authenticated;

create table public.child_safety_profiles (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children(id) on delete cascade,
  preferred_name text,
  photo_path text,
  height text,
  weight text,
  hair_color text,
  eye_color text,
  identifying_features text,
  communication_methods text[] not null default '{}',
  responds_to_name text check (
    responds_to_name is null
    or responds_to_name in ('yes', 'sometimes', 'not-usually', 'unknown')
  ),
  communication_supports text[] not null default '{}',
  helpful_phrases text,
  approach_guidance text[] not null default '{}',
  approach_notes text,
  wandering_history text check (
    wandering_history is null
    or wandering_history in ('yes', 'no', 'unknown')
  ),
  wandering_patterns text[] not null default '{}',
  safety_concerns text[] not null default '{}',
  sensory_challenges text[] not null default '{}',
  regulation_supports text[] not null default '{}',
  important_health_safety_notes text,
  additional_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index child_safety_profiles_child_id_idx
on public.child_safety_profiles(child_id);

create or replace function public.set_child_safety_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_child_safety_profile_updated_at
before update on public.child_safety_profiles
for each row execute function public.set_child_safety_profile_updated_at();

alter table public.child_safety_profiles enable row level security;

create policy "Authorized caregivers can read safety profiles"
on public.child_safety_profiles
for select
to authenticated
using (public.can_access_child_safety(child_id));

create policy "Owners and parents can create safety profiles"
on public.child_safety_profiles
for insert
to authenticated
with check (public.can_edit_child_safety(child_id));

create policy "Owners and parents can update safety profiles"
on public.child_safety_profiles
for update
to authenticated
using (public.can_edit_child_safety(child_id))
with check (public.can_edit_child_safety(child_id));

create policy "Owners and parents can delete safety profiles"
on public.child_safety_profiles
for delete
to authenticated
using (public.can_edit_child_safety(child_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child-safety-photos',
  'child-safety-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authorized caregivers can view safety photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'child-safety-photos'
  and public.can_access_child_safety(((storage.foldername(name))[1])::uuid)
);

create policy "Owners and parents can upload safety photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'child-safety-photos'
  and public.can_edit_child_safety(((storage.foldername(name))[1])::uuid)
);

create policy "Owners and parents can update safety photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'child-safety-photos'
  and public.can_edit_child_safety(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'child-safety-photos'
  and public.can_edit_child_safety(((storage.foldername(name))[1])::uuid)
);

create policy "Owners and parents can remove safety photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'child-safety-photos'
  and public.can_edit_child_safety(((storage.foldername(name))[1])::uuid)
);
