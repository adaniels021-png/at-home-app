begin;

create or replace function public.resolve_child_server_entitlement(target_child_id uuid)
returns table(
  state text,
  is_pro boolean,
  authoritative boolean,
  source text,
  reason text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  owner_id uuid;
  entitlement public.revenuecat_entitlement_state;
begin
  if caller_id is null or target_child_id is null then
    return query select 'UNKNOWN', false, false, 'revenuecat', 'UNAUTHORIZED_OR_MISSING_CHILD';
    return;
  end if;

  select child.parent_id
  into owner_id
  from public.children child
  where child.id = target_child_id
    and (
      child.parent_id = caller_id
      or exists (
        select 1
        from public.child_caregivers membership
        where membership.child_id = child.id
          and membership.caregiver_user_id = caller_id
          and membership.status = 'accepted'
          and membership.role in ('parent', 'caregiver', 'therapist')
      )
    );

  if owner_id is null then
    return query select 'UNKNOWN', false, false, 'revenuecat', 'UNAUTHORIZED_OR_MISSING_CHILD';
    return;
  end if;

  select state_row.*
  into entitlement
  from public.revenuecat_entitlement_state state_row
  where state_row.user_id = owner_id;

  if entitlement.user_id is null then
    return query select 'UNKNOWN', false, false, 'revenuecat', 'OWNER_ENTITLEMENT_NOT_SYNCHRONIZED';
  elsif entitlement.environment <> 'PRODUCTION' then
    return query select 'UNKNOWN', false, false, 'revenuecat', 'NON_PRODUCTION_ENTITLEMENT';
  elsif entitlement.entitlement_active
    and (entitlement.expires_at is null or entitlement.expires_at > now())
    and entitlement.state in ('TRIAL', 'PRO') then
    return query select entitlement.state, true, true, 'revenuecat', 'ACTIVE_OWNER_ENTITLEMENT';
  elsif not entitlement.entitlement_active
    or (entitlement.expires_at is not null and entitlement.expires_at <= now()) then
    return query select 'FREE', false, true, 'revenuecat', 'NO_ACTIVE_OWNER_ENTITLEMENT';
  else
    return query select 'UNKNOWN', false, false, 'revenuecat', 'INVALID_SYNCHRONIZED_STATE';
  end if;
end;
$$;

revoke all on function public.resolve_child_server_entitlement(uuid) from public, anon;
grant execute on function public.resolve_child_server_entitlement(uuid) to authenticated;

commit;
