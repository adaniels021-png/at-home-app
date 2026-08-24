-- LOCAL TESTS ONLY. Requires caregiver-migration-local-bootstrap.sql and the
-- target migration in a disposable database. The opt-in psql variable makes
-- accidental execution fail closed.
\if :{?local_caregiver_validation}
\else
  \quit
\endif
\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000001','owner@example.test'),
 ('00000000-0000-0000-0000-000000000002','parenta@example.test'),
 ('00000000-0000-0000-0000-000000000003','parentb@example.test'),
 ('00000000-0000-0000-0000-000000000004','sarah@example.test'),
 ('00000000-0000-0000-0000-000000000005','therapist@example.test'),
 ('00000000-0000-0000-0000-000000000006','outsider@example.test'),
 ('00000000-0000-0000-0000-000000000007','sarah-new@example.test'),
 ('00000000-0000-0000-0000-000000000008','wrong-email@example.test');
insert into public.children(id,parent_id,child_name) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Maya Test'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Noah Test');
insert into public.child_caregivers(child_id,caregiver_user_id,owner_user_id,role,status) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','parent','accepted'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','parent','accepted'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','caregiver','accepted'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','therapist','accepted');
insert into public.child_safety_profiles(child_id,preferred_name,important_health_safety_notes,additional_notes)
values ('10000000-0000-0000-0000-000000000001','Maya','emergency-note','private-note');
insert into public.child_safety_emergency_contacts(child_id,name,phone)
values ('10000000-0000-0000-0000-000000000001','Test Contact','555-0100');
insert into public.child_safety_location_sources(child_id,label)
values ('10000000-0000-0000-0000-000000000001','Test Place');
insert into storage.objects(bucket_id,name)
values ('child-safety-photos','10000000-0000-0000-0000-000000000001/photo.jpg');

create function public.test_assert(condition boolean, message text) returns void language plpgsql as $$
begin if not condition then raise exception 'ASSERTION FAILED: %', message; end if; end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"email":"owner@example.test"}';
select public.test_assert((select count(*) = 2 from public.children), 'owner sees both children');
select public.test_assert(public.has_child_permission('10000000-0000-0000-0000-000000000001','manage_caregivers'), 'owner manages Maya caregivers');
select public.test_assert(public.has_child_permission('10000000-0000-0000-0000-000000000002','manage_caregivers'), 'owner manages Noah caregivers');
update public.children set name = 'Maya Owner Edit' where id = '10000000-0000-0000-0000-000000000001';
update public.child_safety_profiles set additional_notes = 'owner-edit' where child_id = '10000000-0000-0000-0000-000000000001';
select public.test_assert((select count(*) = 1 from public.child_safety_profiles), 'owner reads full safety profile');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set request.jwt.claims = '{"email":"parenta@example.test"}';
select public.test_assert((select array_agg(child_name order by child_name) = array['Maya Test'] from public.children), 'parent A sees Maya only');
select public.test_assert(not public.has_child_permission('10000000-0000-0000-0000-000000000001','manage_caregivers'), 'parent cannot manage caregivers');
update public.children set name = 'Maya Parent Edit' where id = '10000000-0000-0000-0000-000000000001';
select public.test_assert((select count(*) = 1 from public.child_safety_profiles), 'parent A reads Maya safety');
select public.test_assert(public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000002') is null, 'parent A cannot read Noah emergency');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
set request.jwt.claims = '{"email":"parentb@example.test"}';
select public.test_assert((select array_agg(child_name order by child_name) = array['Noah Test'] from public.children), 'parent B sees Noah only');
select public.test_assert((select count(*) = 0 from public.child_safety_profiles), 'parent B cannot read Maya safety');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
set request.jwt.claims = '{"email":"sarah@example.test"}';
select public.test_assert((select array_agg(child_name order by child_name) = array['Maya Test'] from public.children), 'caregiver sees Maya only');
select public.test_assert(public.has_child_permission('10000000-0000-0000-0000-000000000001','use_elopement_response'), 'caregiver emergency action allowed for Maya');
select public.test_assert(not public.has_child_permission('10000000-0000-0000-0000-000000000002','use_elopement_response'), 'caregiver emergency action denied for Noah');
select public.test_assert((select count(*) = 0 from public.child_safety_profiles), 'caregiver full safety denied');
select public.test_assert(not public.can_edit_child_safety('10000000-0000-0000-0000-000000000001'), 'caregiver safety edit denied');
select public.test_assert((public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000001')->>'important_health_safety_notes') = 'emergency-note', 'caregiver gets approved emergency projection');
select public.test_assert(not (public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000001') ? 'additional_notes'), 'emergency projection excludes private notes');
select public.test_assert(public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000002') is null, 'caregiver Noah emergency denied');
select public.test_assert((select count(*) = 1 from public.child_safety_emergency_contacts), 'caregiver reads Maya emergency contact');
select public.test_assert((select count(*) = 1 from public.child_safety_location_sources), 'caregiver reads Maya location source');
select public.test_assert((select count(*) = 1 from storage.objects), 'caregiver reads Maya safety photo');
do $$ declare affected integer; begin
  update public.children set name = 'forbidden' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  perform public.test_assert(affected = 0, 'caregiver cannot edit child profile');
  update public.child_safety_profiles set additional_notes = 'forbidden';
  get diagnostics affected = row_count;
  perform public.test_assert(affected = 0, 'caregiver cannot edit full safety');
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
set request.jwt.claims = '{"email":"therapist@example.test"}';
select public.test_assert((select count(*) = 1 from public.children), 'therapist sees Maya only');
select public.test_assert(not public.has_child_permission('10000000-0000-0000-0000-000000000001','use_elopement_response'), 'therapist emergency action denied');
select public.test_assert(public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000001') is null, 'therapist emergency projection denied');
select public.test_assert((select count(*) = 0 from public.child_safety_profiles), 'therapist full safety denied');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
set request.jwt.claims = '{"email":"outsider@example.test"}';
select public.test_assert((select count(*) = 0 from public.children), 'outsider sees no children');
select public.test_assert((select count(*) = 0 from public.child_caregivers), 'outsider sees no memberships');
select public.test_assert((select count(*) = 0 from public.caregiver_invites), 'outsider sees no invites');
select public.test_assert(public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000001') is null, 'outsider emergency denied');

-- Invite creation is owner-only and server-generated.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"email":"owner@example.test"}';
select public.create_caregiver_invite('10000000-0000-0000-0000-000000000001','generated@example.test','caregiver') as generated_invite \gset
select public.test_assert(:'generated_invite' ~ '^[0-9A-F]{10}$', 'server invite code format');
do $$ begin
  begin perform public.create_caregiver_invite('10000000-0000-0000-0000-000000000001','bad@example.test','owner'); raise exception 'ASSERTION FAILED: owner invite role accepted';
  exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end;
  begin perform public.create_caregiver_invite('10000000-0000-0000-0000-000000000001','bad@example.test','admin'); raise exception 'ASSERTION FAILED: unsupported invite role accepted';
  exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
set request.jwt.claims = '{"email":"sarah@example.test"}';
do $$ begin begin perform public.create_caregiver_invite('10000000-0000-0000-0000-000000000001','x@example.test','caregiver'); raise exception 'ASSERTION FAILED: caregiver created invite'; exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set request.jwt.claims = '{"email":"parenta@example.test"}';
do $$ begin begin perform public.create_caregiver_invite('10000000-0000-0000-0000-000000000001','x@example.test','caregiver'); raise exception 'ASSERTION FAILED: parent created invite'; exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
set request.jwt.claims = '{"email":"outsider@example.test"}';
do $$ begin begin perform public.create_caregiver_invite('10000000-0000-0000-0000-000000000001','x@example.test','caregiver'); raise exception 'ASSERTION FAILED: outsider created invite'; exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end; end $$;

-- Seed deterministic acceptance cases as database owner; acceptance itself is
-- exercised only through the authenticated SECURITY DEFINER RPC.
reset role;
insert into public.caregiver_invites(child_id,invited_email,role,invite_code,status,created_by) values
 ('10000000-0000-0000-0000-000000000001','sarah-new@example.test','caregiver','ACCEPT0001','pending','00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000001','sarah-new@example.test','caregiver','WRONG00001','pending','00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000001','sarah-new@example.test','caregiver','EXPIRE0001','pending','00000000-0000-0000-0000-000000000001');
update public.caregiver_invites set expires_at = now() - interval '1 minute' where invite_code = 'EXPIRE0001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
set request.jwt.claims = '{"email":"wrong-email@example.test"}';
do $$ begin begin perform public.accept_caregiver_invite('WRONG00001'); raise exception 'ASSERTION FAILED: wrong email accepted invite'; exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
set request.jwt.claims = '{"email":"sarah-new@example.test"}';
select public.test_assert(public.accept_caregiver_invite('ACCEPT0001') = '10000000-0000-0000-0000-000000000001', 'correct email accepts Maya invite');
select public.test_assert((select count(*) = 1 from public.child_caregivers where caregiver_user_id = auth.uid() and child_id = '10000000-0000-0000-0000-000000000001' and role = 'caregiver'), 'acceptance creates exact Maya caregiver membership');
select public.test_assert((select count(*) = 1 from public.children), 'new caregiver sees Maya only');
do $$ begin
  begin perform public.accept_caregiver_invite('ACCEPT0001'); raise exception 'ASSERTION FAILED: invite reused'; exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end;
  begin perform public.accept_caregiver_invite('EXPIRE0001'); raise exception 'ASSERTION FAILED: expired invite accepted'; exception when others then if sqlerrm like 'ASSERTION FAILED:%' then raise; end if; end;
end $$;

-- Overrides: owner may set supported keys, while non-owners and unsupported
-- keys are denied. A cross-child override remains inert without membership.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"email":"owner@example.test"}';
insert into public.child_caregiver_permission_overrides(child_id,caregiver_user_id,permission,allowed,granted_by) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','view_progress',false,'00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','view_safety_profile',true,'00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','view_progress',true,'00000000-0000-0000-0000-000000000001');
do $$ begin begin
  insert into public.child_caregiver_permission_overrides(child_id,caregiver_user_id,permission,allowed,granted_by)
  values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','manage_caregivers',true,'00000000-0000-0000-0000-000000000001');
  raise exception 'ASSERTION FAILED: unsupported override accepted';
exception when check_violation then null; end; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
set request.jwt.claims = '{"email":"sarah@example.test"}';
select public.test_assert(not public.has_child_permission('10000000-0000-0000-0000-000000000001','view_progress'), 'explicit deny override wins');
select public.test_assert(public.has_child_permission('10000000-0000-0000-0000-000000000001','view_safety_profile'), 'explicit allow override wins');
select public.test_assert(not public.has_child_permission('10000000-0000-0000-0000-000000000002','view_progress'), 'cross-child override is inert');
do $$ begin begin
  insert into public.child_caregiver_permission_overrides(child_id,caregiver_user_id,permission,allowed,granted_by)
  values ('10000000-0000-0000-0000-000000000001',auth.uid(),'edit_safety_profile',true,auth.uid());
  raise exception 'ASSERTION FAILED: caregiver self-granted override';
exception when insufficient_privilege then null; end; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set request.jwt.claims = '{"email":"parenta@example.test"}';
do $$ begin begin
  insert into public.child_caregiver_permission_overrides(child_id,caregiver_user_id,permission,allowed,granted_by)
  values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','edit_safety_profile',true,auth.uid());
  raise exception 'ASSERTION FAILED: parent granted override';
exception when insufficient_privilege then null; end; end $$;

-- Removal must revoke database authorization immediately, without a new JWT.
reset role;
delete from public.child_caregivers where caregiver_user_id = '00000000-0000-0000-0000-000000000004';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
set request.jwt.claims = '{"email":"sarah@example.test"}';
select public.test_assert((select count(*) = 0 from public.children), 'removal revokes child access immediately');
select public.test_assert(public.get_child_emergency_response_profile('10000000-0000-0000-0000-000000000001') is null, 'removal revokes emergency projection immediately');
select public.test_assert(not public.has_child_permission('10000000-0000-0000-0000-000000000001','view_progress'), 'removal revokes progress permission immediately');
select public.test_assert((select count(*) = 0 from public.child_safety_profiles), 'removal revokes safety access immediately');
reset role;

select 'LOCAL CAREGIVER MIGRATION TESTS PASSED' as result;
