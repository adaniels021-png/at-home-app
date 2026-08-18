-- Phase 9F.1: server-enforced Admin identity foundation.
-- This migration intentionally does not alter lesson_library policies. Existing
-- linked policies must be inspected before a separate surgical policy migration.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

revoke all on table public.app_admins from anon, authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
      and is_active = true
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- One-time bootstrap only. Email is not consulted by is_app_admin() or RLS.
insert into public.app_admins (user_id, is_active, created_by)
select id, true, id
from auth.users
where lower(email) = lower('adaniels021@gmail.com')
on conflict (user_id) do nothing;

comment on table public.app_admins is
  'Server-controlled application administrators. No direct mobile-client access.';
comment on function public.is_app_admin() is
  'Returns whether the current authenticated auth.uid() is an active app administrator.';
