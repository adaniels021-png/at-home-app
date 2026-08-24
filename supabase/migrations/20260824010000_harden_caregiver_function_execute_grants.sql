-- Supabase grants anon direct function execution through production default
-- privileges. Harden only the child-scoped caregiver authorization RPCs.

revoke execute on function public.child_access_role(uuid) from public, anon;
revoke execute on function public.has_child_access(uuid) from public, anon;
revoke execute on function public.has_child_permission(uuid, text) from public, anon;
revoke execute on function public.can_access_child_safety(uuid) from public, anon;
revoke execute on function public.can_edit_child_safety(uuid) from public, anon;
revoke execute on function public.can_use_child_safety_mode(uuid) from public, anon;
revoke execute on function public.can_participate_child_safety_incident(uuid) from public, anon;
revoke execute on function public.get_child_emergency_response_profile(uuid) from public, anon;
revoke execute on function public.create_caregiver_invite(uuid, text, text) from public, anon;
revoke execute on function public.accept_caregiver_invite(text) from public, anon;

grant execute on function public.child_access_role(uuid) to authenticated;
grant execute on function public.has_child_access(uuid) to authenticated;
grant execute on function public.has_child_permission(uuid, text) to authenticated;
grant execute on function public.can_access_child_safety(uuid) to authenticated;
grant execute on function public.can_edit_child_safety(uuid) to authenticated;
grant execute on function public.can_use_child_safety_mode(uuid) to authenticated;
grant execute on function public.can_participate_child_safety_incident(uuid) to authenticated;
grant execute on function public.get_child_emergency_response_profile(uuid) to authenticated;
grant execute on function public.create_caregiver_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_caregiver_invite(text) to authenticated;
