begin;

-- An invited adult may leave one shared child without gaining any authority
-- over the child, owner, or another caregiver membership.
create or replace function public.remove_my_child_access(target_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  removed_count integer;
begin
  if caller is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if target_child_id is null then
    raise exception using errcode = '22004', message = 'CHILD_REQUIRED';
  end if;

  if exists (
    select 1 from public.children child
    where child.id = target_child_id and child.parent_id = caller
  ) then
    raise exception using errcode = '42501', message = 'OWNER_CANNOT_REMOVE_OWNERSHIP';
  end if;

  if not exists (
    select 1 from public.child_caregivers membership
    where membership.child_id = target_child_id
      and membership.caregiver_user_id = caller
      and membership.status = 'accepted'
      and membership.role in ('parent', 'caregiver', 'therapist')
  ) then
    raise exception using errcode = '42501', message = 'MEMBERSHIP_NOT_FOUND';
  end if;

  delete from public.child_caregiver_permission_overrides override_row
  where override_row.child_id = target_child_id
    and override_row.caregiver_user_id = caller;

  delete from public.child_safety_permissions safety_permission
  where safety_permission.child_id = target_child_id
    and safety_permission.caregiver_user_id = caller;

  delete from public.child_caregivers membership
  where membership.child_id = target_child_id
    and membership.caregiver_user_id = caller
    and membership.status = 'accepted'
    and membership.role in ('parent', 'caregiver', 'therapist');

  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

revoke all on function public.remove_my_child_access(uuid) from public, anon;
grant execute on function public.remove_my_child_access(uuid) to authenticated;

commit;
