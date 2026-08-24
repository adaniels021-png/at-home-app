-- LOCAL TEST FIXTURE ONLY. Creates the minimum pre-Phase-1 schema required to
-- execute and behavior-test the caregiver authorization migration in a
-- disposable PostgreSQL database. Never run against a linked project.
\if :{?local_caregiver_validation}
\else
  \quit
\endif

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create schema if not exists storage;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;

create table auth.users (id uuid primary key, email text unique not null);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

create table public.children (
  id uuid primary key, parent_id uuid not null references auth.users(id),
  child_name text, name text, created_at timestamptz default now()
);
create table public.child_caregivers (
  id uuid primary key default extensions.gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id), owner_user_id uuid not null references auth.users(id),
  role text not null, status text not null, created_at timestamptz default now()
);
create table public.caregiver_invites (
  id uuid primary key default extensions.gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  invited_email text not null, role text not null, invite_code text not null,
  status text not null, created_by uuid not null references auth.users(id), created_at timestamptz default now()
);
create unique index caregiver_invites_pending_code_unique on public.caregiver_invites(invite_code) where status = 'pending';
create table public.child_safety_profiles (
  id uuid primary key default extensions.gen_random_uuid(), child_id uuid unique not null references public.children(id) on delete cascade,
  preferred_name text, photo_path text, height text, weight text, hair_color text, eye_color text,
  identifying_features text, communication_methods text[] default '{}', responds_to_name text,
  communication_supports text[] default '{}', helpful_phrases text, approach_guidance text[] default '{}',
  approach_notes text, wandering_patterns text[] default '{}', wandering_destinations text[] default '{}',
  safety_concerns text[] default '{}', important_health_safety_notes text, additional_notes text
);
create table public.child_safety_emergency_contacts (
  id uuid primary key default extensions.gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  name text not null, phone text, notes text
);
create table public.child_safety_location_sources (
  id uuid primary key default extensions.gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  label text not null, notes text
);
create table storage.objects (id uuid primary key default extensions.gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1] $$;

alter table public.children enable row level security;
alter table public.child_caregivers enable row level security;
alter table public.caregiver_invites enable row level security;
alter table public.child_safety_profiles enable row level security;
alter table public.child_safety_emergency_contacts enable row level security;
alter table public.child_safety_location_sources enable row level security;
alter table storage.objects enable row level security;

-- These policies are created by the earlier Safety Profile migration. The
-- target migration replaces the helper implementations without dropping the
-- policies, so the fixture models that production ordering.
create function public.can_access_child_safety(uuid) returns boolean language sql stable as $$ select false $$;
create function public.can_edit_child_safety(uuid) returns boolean language sql stable as $$ select false $$;
create policy "Authorized caregivers can read safety profiles"
on public.child_safety_profiles for select to authenticated
using (public.can_access_child_safety(child_id));
create policy "Owners and parents can create safety profiles"
on public.child_safety_profiles for insert to authenticated
with check (public.can_edit_child_safety(child_id));
create policy "Owners and parents can update safety profiles"
on public.child_safety_profiles for update to authenticated
using (public.can_edit_child_safety(child_id))
with check (public.can_edit_child_safety(child_id));
create policy "Owners and parents can delete safety profiles"
on public.child_safety_profiles for delete to authenticated
using (public.can_edit_child_safety(child_id));

grant usage on schema public, auth, storage, extensions to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on storage.objects to authenticated;
