-- Child-scoped caregiver authorization. This migration is intentionally local
-- until reviewed and deployed through the normal production release process.

create table if not exists public.child_caregiver_permission_overrides (
  child_id uuid not null references public.children(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in (
    'view_learning_content', 'use_communication_tools', 'view_progress',
    'edit_progress', 'use_elopement_response', 'view_emergency_response_data',
    'view_safety_profile', 'edit_safety_profile'
  )),
  allowed boolean not null,
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (child_id, caregiver_user_id, permission)
);
revoke all on table public.child_caregiver_permission_overrides from public, anon;
grant select, insert, update, delete on table public.child_caregiver_permission_overrides to authenticated;

create or replace function public.child_access_role(target_child_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.children c where c.id = target_child_id and c.parent_id = auth.uid()) then 'owner'
    else (select cc.role from public.child_caregivers cc
      where cc.child_id = target_child_id and cc.caregiver_user_id = auth.uid()
        and cc.status = 'accepted' and cc.role in ('parent', 'caregiver', 'therapist')
      limit 1)
  end;
$$;

create or replace function public.has_child_access(target_child_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.child_access_role(target_child_id) is not null;
$$;

create or replace function public.has_child_permission(target_child_id uuid, requested_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  with access as (select public.child_access_role(target_child_id) as role),
  override_value as (
    select o.allowed from public.child_caregiver_permission_overrides o
    where o.child_id = target_child_id and o.caregiver_user_id = auth.uid()
      and o.permission = requested_permission limit 1
  )
  select case
    when access.role is null then false
    when access.role = 'owner' then true
    when exists (select 1 from override_value) then (select allowed from override_value)
    when access.role = 'parent' then requested_permission in (
      'view_child', 'edit_child_profile', 'view_learning_content',
      'use_communication_tools', 'view_progress', 'edit_progress',
      'use_elopement_response', 'view_emergency_response_data',
      'view_safety_profile', 'edit_safety_profile', 'use_help_now_general',
      'manage_child_settings'
    )
    when access.role = 'caregiver' then requested_permission in (
      'view_child', 'view_learning_content', 'use_communication_tools',
      'view_progress', 'edit_progress', 'use_elopement_response',
      'view_emergency_response_data'
    )
    when access.role = 'therapist' then requested_permission in (
      'view_child', 'view_learning_content', 'use_communication_tools',
      'view_progress', 'edit_progress'
    )
    else false
  end from access;
$$;

revoke all on function public.child_access_role(uuid) from public;
revoke all on function public.has_child_access(uuid) from public;
revoke all on function public.has_child_permission(uuid, text) from public;
grant execute on function public.child_access_role(uuid) to authenticated;
grant execute on function public.has_child_access(uuid) to authenticated;
grant execute on function public.has_child_permission(uuid, text) to authenticated;

create unique index if not exists child_caregivers_child_user_unique
on public.child_caregivers(child_id, caregiver_user_id);

alter table public.caregiver_invites
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz;
update public.caregiver_invites
set expires_at = coalesce(created_at, now()) + interval '7 days'
where expires_at is null;
alter table public.caregiver_invites
  alter column expires_at set default (now() + interval '7 days'),
  alter column expires_at set not null;
create unique index if not exists caregiver_invites_pending_code_unique
on public.caregiver_invites(invite_code) where status = 'pending';

alter table public.child_caregiver_permission_overrides enable row level security;
drop policy if exists "Owners manage child caregiver permission overrides" on public.child_caregiver_permission_overrides;
create policy "Owners manage child caregiver permission overrides"
on public.child_caregiver_permission_overrides for all to authenticated
using (public.child_access_role(child_id) = 'owner')
with check (public.child_access_role(child_id) = 'owner' and granted_by = auth.uid());
drop policy if exists "Caregivers view own permission overrides" on public.child_caregiver_permission_overrides;
create policy "Caregivers view own permission overrides"
on public.child_caregiver_permission_overrides for select to authenticated
using (caregiver_user_id = auth.uid());

-- Children are returned only when the caller owns that exact child or has an
-- accepted membership for that exact child. Knowing a sibling UUID is useless.
alter table public.children enable row level security;
do $$ declare policy_name text; begin
  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'children'
  loop execute format('drop policy %I on public.children', policy_name); end loop;
end $$;
create policy "Users read authorized children only" on public.children
for select to authenticated using (public.has_child_access(id));
create policy "Owners create their children" on public.children
for insert to authenticated with check (parent_id = auth.uid());
create policy "Owners update their children" on public.children
for update to authenticated
using (public.has_child_permission(id, 'edit_child_profile'))
with check (public.has_child_permission(id, 'edit_child_profile'));
create policy "Owners delete their children" on public.children
for delete to authenticated using (parent_id = auth.uid());

alter table public.child_caregivers enable row level security;
do $$ declare policy_name text; begin
  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'child_caregivers'
  loop execute format('drop policy %I on public.child_caregivers', policy_name); end loop;
end $$;
create policy "Members read own child memberships" on public.child_caregivers
for select to authenticated using (
  caregiver_user_id = auth.uid() or public.child_access_role(child_id) = 'owner'
);
-- Preserve the legacy self-owner membership row created during add-child.
create policy "Owners manage child memberships" on public.child_caregivers
for all to authenticated using (public.child_access_role(child_id) = 'owner')
with check (
  public.child_access_role(child_id) = 'owner'
  and (
    role in ('parent', 'caregiver', 'therapist')
    or (role = 'owner' and caregiver_user_id = auth.uid() and owner_user_id = auth.uid())
  )
);

alter table public.caregiver_invites enable row level security;
do $$ declare policy_name text; begin
  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'caregiver_invites'
  loop execute format('drop policy %I on public.caregiver_invites', policy_name); end loop;
end $$;
create policy "Owners read child invites" on public.caregiver_invites
for select to authenticated using (public.child_access_role(child_id) = 'owner');
create policy "Owners cancel child invites" on public.caregiver_invites
for delete to authenticated using (public.child_access_role(child_id) = 'owner');

-- Full Safety Profile is private to owners/parents or an explicit override.
create or replace function public.can_access_child_safety(target_child_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_child_permission(target_child_id, 'view_safety_profile');
$$;
create or replace function public.can_edit_child_safety(target_child_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_child_permission(target_child_id, 'edit_safety_profile');
$$;
create or replace function public.can_use_child_safety_mode(target_child_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_child_permission(target_child_id, 'use_elopement_response');
$$;
create or replace function public.can_participate_child_safety_incident(target_child_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_child_permission(target_child_id, 'use_elopement_response');
$$;
revoke all on function public.can_access_child_safety(uuid) from public;
revoke all on function public.can_edit_child_safety(uuid) from public;
revoke all on function public.can_use_child_safety_mode(uuid) from public;
revoke all on function public.can_participate_child_safety_incident(uuid) from public;
grant execute on function public.can_access_child_safety(uuid) to authenticated;
grant execute on function public.can_edit_child_safety(uuid) to authenticated;
grant execute on function public.can_use_child_safety_mode(uuid) to authenticated;
grant execute on function public.can_participate_child_safety_incident(uuid) to authenticated;

-- Emergency response exposes a deliberately limited projection, not the full
-- editable/private Safety Profile row.
create or replace function public.get_child_emergency_response_profile(target_child_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.has_child_permission(target_child_id, 'view_emergency_response_data') then
    (select jsonb_build_object(
      'child_id', p.child_id, 'preferred_name', p.preferred_name,
      'photo_path', p.photo_path, 'height', p.height, 'weight', p.weight,
      'hair_color', p.hair_color, 'eye_color', p.eye_color,
      'identifying_features', p.identifying_features,
      'communication_methods', p.communication_methods,
      'responds_to_name', p.responds_to_name,
      'communication_supports', p.communication_supports,
      'helpful_phrases', p.helpful_phrases,
      'approach_guidance', p.approach_guidance, 'approach_notes', p.approach_notes,
      'wandering_patterns', p.wandering_patterns,
      'wandering_destinations', p.wandering_destinations,
      'safety_concerns', p.safety_concerns,
      'important_health_safety_notes', p.important_health_safety_notes
    ) from public.child_safety_profiles p where p.child_id = target_child_id)
  else null end;
$$;
revoke all on function public.get_child_emergency_response_profile(uuid) from public;
grant execute on function public.get_child_emergency_response_profile(uuid) to authenticated;

drop policy if exists "Emergency responders can view safety photos" on storage.objects;
create policy "Emergency responders can view safety photos" on storage.objects
for select to authenticated using (
  bucket_id = 'child-safety-photos'
  and public.has_child_permission(((storage.foldername(name))[1])::uuid, 'view_emergency_response_data')
);
drop policy if exists "Emergency responders can read safety contacts" on public.child_safety_emergency_contacts;
create policy "Emergency responders can read safety contacts"
on public.child_safety_emergency_contacts for select to authenticated
using (public.has_child_permission(child_id, 'view_emergency_response_data'));
drop policy if exists "Emergency responders can read location sources" on public.child_safety_location_sources;
create policy "Emergency responders can read location sources"
on public.child_safety_location_sources for select to authenticated
using (public.has_child_permission(child_id, 'view_emergency_response_data'));

create or replace function public.create_caregiver_invite(
  target_child_id uuid, target_email text, target_role text
) returns text language plpgsql security definer set search_path = '' as $$
declare generated_code text;
begin
  if public.child_access_role(target_child_id) is distinct from 'owner' then
    raise exception 'only the child owner can invite caregivers';
  end if;
  if target_role not in ('parent', 'caregiver', 'therapist') then raise exception 'invalid caregiver role'; end if;
  if lower(trim(target_email)) = lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'cannot invite yourself'; end if;
  loop
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    begin
      insert into public.caregiver_invites (child_id, invited_email, role, invite_code, status, created_by)
      values (target_child_id, lower(trim(target_email)), target_role, generated_code, 'pending', auth.uid());
      return generated_code;
    exception when unique_violation then
      -- Generate a new code if another transaction claimed this one first.
    end;
  end loop;
end;
$$;
revoke all on function public.create_caregiver_invite(uuid, text, text) from public;
grant execute on function public.create_caregiver_invite(uuid, text, text) to authenticated;

-- Invite acceptance is atomic, email-bound, single-use, role-constrained, and
-- inserts membership only for the invited child.
create or replace function public.accept_caregiver_invite(p_invite_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite public.caregiver_invites%rowtype; caller_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into invite from public.caregiver_invites
    where invite_code = upper(trim(p_invite_code)) and status = 'pending'
      and expires_at > now()
    for update;
  if not found then raise exception 'invalid or already-used invite'; end if;
  if lower(invite.invited_email) <> caller_email then raise exception 'invite email does not match signed-in user'; end if;
  if invite.role not in ('parent', 'caregiver', 'therapist') then raise exception 'invalid caregiver role'; end if;
  if invite.created_by = auth.uid() then raise exception 'owners cannot accept their own invite'; end if;
  insert into public.child_caregivers (child_id, caregiver_user_id, owner_user_id, role, status)
  values (invite.child_id, auth.uid(), invite.created_by, invite.role, 'accepted')
  on conflict (child_id, caregiver_user_id) do update
    set role = excluded.role, status = 'accepted', owner_user_id = excluded.owner_user_id;
  update public.caregiver_invites set status = 'accepted', accepted_at = now()
    where id = invite.id and status = 'pending';
  return invite.child_id;
end;
$$;
revoke all on function public.accept_caregiver_invite(text) from public;
grant execute on function public.accept_caregiver_invite(text) to authenticated;
