-- Phase 9F.6: plain-language, production-only human decision workflow.
-- Seeds recommendations and deterministic states, but approves no metadata.
begin;

alter table public.lesson_personalization_metadata
  add column mastery_reviewed boolean not null default false,
  add column human_decision_summary jsonb not null default '{}'::jsonb,
  add column last_review_method text;

create table public.lesson_personalization_review_decisions (
  id uuid primary key default gen_random_uuid(),
  metadata_id uuid not null references public.lesson_personalization_metadata(id) on delete cascade,
  lesson_id uuid not null references public.lesson_library(id) on delete cascade,
  decision_key text not null,
  decision_category text not null check (decision_category in ('communication','safety_material','prerequisite','mastery','duplicate_progression')),
  classification text not null,
  requires_human boolean not null,
  decision_status text not null check (decision_status in ('resolved_deterministic','unresolved','human_confirmed','human_edited','needs_more_review')),
  plain_language_summary text not null,
  prompt text,
  recommendation text,
  rationale text,
  candidate_value jsonb not null default '{}'::jsonb,
  final_value jsonb,
  provenance text not null check (provenance in ('generated_candidate','deterministic','human_confirmed','human_edited')),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(metadata_id,decision_key)
);

create table public.lesson_personalization_review_decision_history (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.lesson_personalization_review_decisions(id) on delete restrict,
  metadata_id uuid not null references public.lesson_personalization_metadata(id) on delete restrict,
  lesson_id uuid not null references public.lesson_library(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  decision_snapshot jsonb not null,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  review_method text not null,
  created_at timestamptz not null default now()
);

alter table public.lesson_personalization_review_decisions enable row level security;
alter table public.lesson_personalization_review_decision_history enable row level security;
revoke all on public.lesson_personalization_review_decisions from anon,authenticated;
revoke all on public.lesson_personalization_review_decision_history from anon,authenticated;
grant select on public.lesson_personalization_review_decisions to authenticated;
grant select on public.lesson_personalization_review_decision_history to authenticated;
create policy "App admins read production metadata decisions" on public.lesson_personalization_review_decisions for select to authenticated using (public.is_app_admin());
create policy "App admins read production decision history" on public.lesson_personalization_review_decision_history for select to authenticated using (public.is_app_admin());

create or replace function public.log_lesson_personalization_review_decision()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if auth.uid() is null or not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
  insert into public.lesson_personalization_review_decision_history(decision_id,metadata_id,lesson_id,previous_status,new_status,decision_snapshot,reviewer_user_id,review_method)
  values(new.id,new.metadata_id,new.lesson_id,old.decision_status,new.decision_status,to_jsonb(new),auth.uid(),coalesce(current_setting('app.metadata_review_action',true),'production_review'));
  return new;
end;$$;
revoke all on function public.log_lesson_personalization_review_decision() from public,anon,authenticated;
create trigger lesson_personalization_review_decision_history_trigger after update on public.lesson_personalization_review_decisions for each row execute function public.log_lesson_personalization_review_decision();

-- Communication decisions: explicit multimodal evidence can resolve
-- deterministically; speech targets, ambiguity, and higher complexity remain human.
with base as (
  select m.*,l.title,l.stage_number,to_jsonb(l)::text as lesson_text
  from public.lesson_personalization_metadata m join public.lesson_library l on l.id=m.lesson_id
  where l.quality_status='approved' and l.is_active and m.metadata_version=1
), classified as (
  select *,case
    when target_skill_code='communication.speech_clarity' or lower(title) in ('copy my sound','back-and-forth sounds') then 'speech_targeted'
    when target_skill_code in ('communication.conversation','communication.answering_questions','communication.following_directions') and stage_number>=3 then 'higher_complexity'
    when (lesson_text ~* '(aac|pecs|picture card|say,? sign|sign,? point|any (form|way) of communication)') and cardinality(supported_response_modes)>=3 then 'clearly_multimodal'
    when candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' or target_skill_code like 'communication.%' then 'ambiguous'
    else 'not_response_dependent' end as class
  from base
)
insert into public.lesson_personalization_review_decisions(metadata_id,lesson_id,decision_key,decision_category,classification,requires_human,decision_status,plain_language_summary,prompt,recommendation,rationale,candidate_value,provenance)
select id,lesson_id,'communication','communication',class,
  class in ('speech_targeted','higher_complexity','ambiguous'),
  case when class in ('speech_targeted','higher_complexity','ambiguous') then 'unresolved' else 'resolved_deterministic' end,
  case class
    when 'speech_targeted' then 'This lesson appears to teach speech or sound production itself.'
    when 'higher_complexity' then 'This lesson assumes a more complex communication response.'
    when 'clearly_multimodal' then 'The lesson explicitly supports equivalent intentional responses such as speech, AAC, pictures, signs, or gestures.'
    when 'ambiguous' then 'The wording may mention speaking even though another intentional response could show the skill.'
    else 'This lesson does not depend on a specific communication method.' end,
  case when class='speech_targeted' then 'Keep speech or sound as a required response?' when class='higher_complexity' then 'Confirm the communication complexity this lesson requires.' when class='ambiguous' then 'Should equivalent AAC, picture, sign, or gesture responses be allowed?' end,
  case when class='speech_targeted' then 'Review suggested: retain speech only when producing speech/sound is the learning target.' when class='higher_complexity' then 'Review suggested: separate communication complexity from communication method.' when class='ambiguous' then 'Review suggested: allow equivalent intentional communication when speech is not the target.' else 'No human communication decision is required.' end,
  'Classification uses the lesson target, stage, explicit response language, and supported response modes.',
  jsonb_build_object('supported_response_modes',supported_response_modes,'min_complexity',min_communication_complexity,'max_complexity',max_communication_complexity),
  case when class in ('speech_targeted','higher_complexity','ambiguous') then 'generated_candidate' else 'deterministic' end
from classified;

-- Safety decisions use required/core lesson fields only. Optional reinforcement
-- and generalization prose cannot turn a descriptor into inherent risk.
with base as (
  select m.*,l.skill_area,lower(concat_ws(' ',array_to_string(l.materials,' '),array_to_string(l.steps,' '),l.setup_instructions,l.expected_child_response,array_to_string(l.prompting_tips,' '),array_to_string(l.safety_notes,' '))) as core_text
  from public.lesson_personalization_metadata m join public.lesson_library l on l.id=m.lesson_id
  where l.quality_status='approved' and l.is_active and m.metadata_version=1
), classified as (
  select *,array_remove(array[
    case when core_text ~ '(food|snack|eat|bite|feeding|allerg)' then 'food_allergy' end,
    case when core_text ~ '(small object|bead|coin|chok|button)' then 'small_object' end,
    case when core_text ~ '(hand[- ]over[- ]hand|physical prompt|physical guidance|deep pressure|hold (the child|their) hand)' then 'physical_contact' end,
    case when core_text ~ '(loud|noise)' then 'loud_sound' end,
    case when core_text ~ '(spin|fast movement|intense movement)' then 'intense_movement' end,
    case when skill_area='Safety Awareness & Impulse Safety' then 'safety_instruction' end
  ],null) as human_reasons,
  array_remove(array[
    case when core_text ~ '(water|sink|wash|bubble)' then 'water' end,
    case when core_text ~ '(walk|run|jump|crawl|balance|movement|roll the ball)' then 'movement' end,
    case when core_text ~ '(music|song)' then 'music' end
  ],null) as descriptors
  from base
)
insert into public.lesson_personalization_review_decisions(metadata_id,lesson_id,decision_key,decision_category,classification,requires_human,decision_status,plain_language_summary,prompt,recommendation,rationale,candidate_value,provenance)
select id,lesson_id,'safety_material','safety_material',
  case when cardinality(human_reasons)>0 then 'human_safety_judgment' when cardinality(descriptors)>0 then 'descriptor_and_restriction_match' else 'no_material_decision' end,
  cardinality(human_reasons)>0,
  case when cardinality(human_reasons)>0 then 'unresolved' else 'resolved_deterministic' end,
  case when cardinality(human_reasons)>0 then 'Core lesson instructions contain a material or activity that needs human review.' when cardinality(descriptors)>0 then 'This lesson has factual material/activity descriptors. A matching caregiver restriction can exclude it later without labeling the lesson inherently unsafe.' else 'No core material or activity requires a safety decision.' end,
  case when cardinality(human_reasons)>0 then 'Confirm how this material or activity should be handled for personalization.' end,
  case when cardinality(human_reasons)>0 then 'Review suggested; do not infer a contraindication automatically.' else 'Keep factual descriptors separate from contraindication tags.' end,
  'Only materials, steps, setup, expected response, prompting, and safety notes are considered core evidence.',
  jsonb_build_object('human_review_reasons',human_reasons,'descriptors',descriptors,'material_activity_tags',material_activity_tags),
  case when cardinality(human_reasons)>0 then 'generated_candidate' else 'deterministic' end
from classified;

-- Prerequisite recommendations never choose Required automatically.
insert into public.lesson_personalization_review_decisions(metadata_id,lesson_id,decision_key,decision_category,classification,requires_human,decision_status,plain_language_summary,prompt,recommendation,rationale,candidate_value,provenance)
select m.id,m.lesson_id,'prerequisite','prerequisite',
  case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'no_prerequisite_deterministic' else 'candidate_needs_confirmation' end,
  m.prerequisite_review_state<>'no_prerequisite_deterministic',
  case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'resolved_deterministic' else 'unresolved' end,
  case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'This appears to be a beginning skill. No earlier skill is required.' else 'This lesson may build on an earlier ability. Decide whether that ability is required, merely helpful, or not a prerequisite.' end,
  case when m.prerequisite_review_state<>'no_prerequisite_deterministic' then 'Is the suggested earlier ability Required, Helpful but not required, Not a prerequisite, or still unclear?' end,
  case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'No human prerequisite decision is required.' else 'Do not choose Required unless the lesson would not make sense without that ability.' end,
  m.prerequisite_classifier_reason,
  jsonb_build_object('suggested_skill_code',case m.target_skill_code when 'communication.conversation' then 'communication.intentional_communication' when 'communication.answering_questions' then 'communication.intentional_communication' when 'communication.following_directions' then 'learning.attention' when 'social.perspective_taking' then 'social.turn_taking' when 'toileting.basic' then 'communication.intentional_communication' else null end,'current_hard_prerequisites',m.prerequisite_skill_codes),
  case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'deterministic' else 'generated_candidate' end
from public.lesson_personalization_metadata m join public.lesson_library l on l.id=m.lesson_id
where l.quality_status='approved' and l.is_active and m.metadata_version=1;

-- Current target-level mastery groups are specific; no broad "all communication"
-- group is present. Preserve the deterministic explanation for Admin review.
insert into public.lesson_personalization_review_decisions(metadata_id,lesson_id,decision_key,decision_category,classification,requires_human,decision_status,plain_language_summary,recommendation,rationale,candidate_value,provenance)
select m.id,m.lesson_id,'mastery','mastery','specific_group_deterministic',false,'resolved_deterministic',
  'Mastering this lesson suppresses lower-level lessons in its specific skill group, not unrelated communication or developmental skills.',
  'No mastery-scope decision is required unless the group is edited.','The mastery group exactly matches the specific target skill code.',
  jsonb_build_object('target_skill_code',m.target_skill_code,'mastery_group',m.mastery_group),'deterministic'
from public.lesson_personalization_metadata m join public.lesson_library l on l.id=m.lesson_id
where l.quality_status='approved' and l.is_active and m.metadata_version=1 and m.mastery_group=m.target_skill_code;

insert into public.lesson_personalization_review_decisions(metadata_id,lesson_id,decision_key,decision_category,classification,requires_human,decision_status,plain_language_summary,prompt,recommendation,rationale,candidate_value,provenance)
select m.id,m.lesson_id,'duplicate_progression','duplicate_progression',case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'duplicate_progression_review' else 'none' end,
  m.candidate_warnings ? 'DUPLICATE_REVIEW',case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'unresolved' else 'resolved_deterministic' end,
  case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'This lesson shares a title or close progression relationship with another lesson.' else 'No duplicate or progression decision is required.' end,
  case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'Classify this as intentional progression, intentional variant, likely duplicate, or needs content review.' end,
  case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'Review both lessons; do not merge or delete either here.' else 'No action needed.' end,
  'Phase 9F.3 duplicate/progression audit.',jsonb_build_object('group_id',m.duplicate_group_id,'candidate_classification',m.duplicate_classification),
  case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'generated_candidate' else 'deterministic' end
from public.lesson_personalization_metadata m join public.lesson_library l on l.id=m.lesson_id
where l.quality_status='approved' and l.is_active and m.metadata_version=1;

-- Synchronize only deterministic resolution state. Sensitive rows remain false.
alter table public.lesson_personalization_metadata disable trigger lesson_personalization_metadata_history_trigger;
update public.lesson_personalization_metadata m set
  communication_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions d where d.metadata_id=m.id and d.decision_category='communication' and d.requires_human and d.decision_status not in ('human_confirmed','human_edited')),
  safety_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions d where d.metadata_id=m.id and d.decision_category='safety_material' and d.requires_human and d.decision_status not in ('human_confirmed','human_edited')),
  mastery_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions d where d.metadata_id=m.id and d.decision_category='mastery' and d.requires_human and d.decision_status not in ('human_confirmed','human_edited')),
  human_decision_summary=(select jsonb_object_agg(d.decision_key,jsonb_build_object('classification',d.classification,'status',d.decision_status,'provenance',d.provenance,'final_value',d.final_value)) from public.lesson_personalization_review_decisions d where d.metadata_id=m.id)
where exists(select 1 from public.lesson_personalization_review_decisions d where d.metadata_id=m.id);
alter table public.lesson_personalization_metadata enable trigger lesson_personalization_metadata_history_trigger;

create or replace function public.review_production_lesson_metadata_decision(p_decision_id uuid,p_outcome text,p_final_value jsonb default '{}'::jsonb,p_reason text default null,p_review_method text default 'production_review')
returns public.lesson_personalization_review_decisions language plpgsql security definer set search_path=pg_catalog,public as $$
declare d public.lesson_personalization_review_decisions;metadata_row public.lesson_personalization_metadata;l public.lesson_library;skill text;
begin
  if not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
  select * into d from public.lesson_personalization_review_decisions where id=p_decision_id for update;
  if d.id is null then raise exception 'Decision not found'; end if;
  select * into l from public.lesson_library where id=d.lesson_id;
  if l.quality_status<>'approved' or not l.is_active then raise exception 'Decision is not for a current production lesson'; end if;
  if (d.decision_category='communication' and p_outcome not in ('confirm_recommendation','speech_required','alternate_modes','needs_more_review','edited'))
    or (d.decision_category='safety_material' and p_outcome not in ('human_confirmed','needs_more_review','edited'))
    or (d.decision_category='mastery' and p_outcome not in ('confirm_scope','needs_more_review','edited'))
    or (d.decision_category='duplicate_progression' and p_outcome not in ('intentional_progression','intentional_variant','likely_duplicate','needs_content_review','needs_more_review','edited'))
  then raise exception 'Invalid outcome for % decision',d.decision_category; end if;
  if p_outcome='needs_more_review' then
    d.decision_status:='needs_more_review';d.provenance:='human_confirmed';
  elsif p_outcome in ('edited','human_edited') then
    d.decision_status:='human_edited';d.provenance:='human_edited';
  else
    d.decision_status:='human_confirmed';d.provenance:='human_confirmed';
  end if;
  if d.decision_category='prerequisite' and p_outcome not in ('required','helpful','not_required','needs_more_review','edited') then raise exception 'Invalid prerequisite outcome'; end if;
  if d.decision_category='prerequisite' and p_outcome='required' then
    skill:=coalesce(p_final_value->>'skill_code',d.candidate_value->>'suggested_skill_code');
    if skill is null then raise exception 'Required prerequisite needs a skill code'; end if;
    select * into metadata_row from public.lesson_personalization_metadata where id=d.metadata_id;
    if skill=metadata_row.target_skill_code then raise exception 'A target cannot be its own prerequisite'; end if;
  end if;
  perform set_config('app.metadata_review_action',p_review_method,true);
  update public.lesson_personalization_review_decisions set decision_status=d.decision_status,final_value=coalesce(p_final_value,'{}'::jsonb)||jsonb_build_object('outcome',p_outcome),provenance=d.provenance,reviewer_user_id=auth.uid(),reviewed_at=now(),review_reason=p_reason,updated_at=now() where id=d.id returning * into d;
  update public.lesson_personalization_metadata meta set
    communication_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=meta.id and x.decision_category='communication' and x.requires_human and x.decision_status not in ('human_confirmed','human_edited')),
    safety_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=meta.id and x.decision_category='safety_material' and x.requires_human and x.decision_status not in ('human_confirmed','human_edited')),
    mastery_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=meta.id and x.decision_category='mastery' and x.requires_human and x.decision_status not in ('human_confirmed','human_edited')),
    duplicate_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=meta.id and x.decision_category='duplicate_progression' and x.requires_human and x.decision_status not in ('human_confirmed','human_edited')),
    prerequisite_review_state=case when d.decision_category='prerequisite' and p_outcome='required' then 'confirmed' when d.decision_category='prerequisite' and p_outcome in ('helpful','not_required') then 'rejected' when d.decision_category='prerequisite' then 'ambiguous' else meta.prerequisite_review_state end,
    prerequisite_skill_codes=case when d.decision_category='prerequisite' and p_outcome='required' then array[coalesce(p_final_value->>'skill_code',d.candidate_value->>'suggested_skill_code')]::text[] when d.decision_category='prerequisite' and p_outcome in ('helpful','not_required') then '{}'::text[] else meta.prerequisite_skill_codes end,
    human_decision_summary=(select jsonb_object_agg(x.decision_key,jsonb_build_object('classification',x.classification,'status',x.decision_status,'provenance',x.provenance,'final_value',x.final_value,'recommendation',x.recommendation)) from public.lesson_personalization_review_decisions x where x.metadata_id=meta.id),
    last_review_method=p_review_method
  where meta.id=d.metadata_id;
  return d;
end;$$;
revoke all on function public.review_production_lesson_metadata_decision(uuid,text,jsonb,text,text) from public,anon;
grant execute on function public.review_production_lesson_metadata_decision(uuid,text,jsonb,text,text) to authenticated;

create or replace function public.approve_production_lesson_personalization_metadata(p_metadata_id uuid,p_review_method text default 'production_review')
returns public.lesson_personalization_metadata language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.lesson_personalization_metadata;l public.lesson_library;errors text[];unresolved integer;decision_count integer;
begin
  if not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
  select * into m from public.lesson_personalization_metadata where id=p_metadata_id for update;
  if m.id is null then raise exception 'Metadata not found'; end if;
  select * into l from public.lesson_library where id=m.lesson_id;
  if l.quality_status<>'approved' or not l.is_active then raise exception 'Only current production lesson metadata can be approved in production review'; end if;
  if m.metadata_version<>1 then raise exception 'Unsupported metadata version'; end if;
  if m.content_fingerprint<>public.lesson_personalization_content_fingerprint(l) or m.metadata_stale then raise exception 'Lesson content fingerprint is stale'; end if;
  select count(*),count(*) filter(where decision_status not in ('resolved_deterministic','human_confirmed','human_edited')) into decision_count,unresolved from public.lesson_personalization_review_decisions where metadata_id=m.id;
  if decision_count<>5 then raise exception 'Production review checklist is incomplete'; end if;
  if unresolved>0 then raise exception '% human decision(s) remain unresolved',unresolved; end if;
  if not m.mastery_reviewed then raise exception 'Mastery relationship remains unresolved'; end if;
  errors:=public.lesson_personalization_validation_errors(m);
  if cardinality(errors)>0 then raise exception 'Metadata validation failed: %',array_to_string(errors,'; '); end if;
  perform set_config('app.metadata_review_action',p_review_method,true);
  update public.lesson_personalization_metadata set review_status='approved',reviewed_by=auth.uid(),reviewed_at=now(),last_review_method=p_review_method,
    human_decision_summary=(select jsonb_object_agg(d.decision_key,jsonb_build_object('classification',d.classification,'status',d.decision_status,'provenance',d.provenance,'final_value',d.final_value,'recommendation',d.recommendation)) from public.lesson_personalization_review_decisions d where d.metadata_id=p_metadata_id)
  where id=p_metadata_id returning * into m;
  return m;
end;$$;
revoke all on function public.approve_production_lesson_personalization_metadata(uuid,text) from public,anon;
grant execute on function public.approve_production_lesson_personalization_metadata(uuid,text) to authenticated;

-- Direct writes and legacy RPCs cannot bypass production decision validation.
create or replace function public.enforce_lesson_personalization_metadata_approval()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare errors text[];lesson_row public.lesson_library;unresolved integer;decision_count integer;
begin
  select * into lesson_row from public.lesson_library where id=new.lesson_id;
  if lesson_row.id is null then raise exception 'Lesson not found'; end if;
  if new.content_fingerprint is null then new.content_fingerprint:=public.lesson_personalization_content_fingerprint(lesson_row); end if;
  new.prerequisite_reviewed:=new.prerequisite_review_state in ('no_prerequisite_deterministic','confirmed','rejected');
  new.review_tier:=public.lesson_personalization_review_tier(new);
  errors:=public.lesson_personalization_validation_errors(new);new.validation_errors:=to_jsonb(errors);new.updated_at:=now();
  if new.review_status='approved' then
    if lesson_row.quality_status<>'approved' or not lesson_row.is_active then raise exception 'Approved metadata requires approved, active lesson content'; end if;
    select count(*),count(*) filter(where decision_status not in ('resolved_deterministic','human_confirmed','human_edited')) into decision_count,unresolved from public.lesson_personalization_review_decisions where metadata_id=new.id;
    if decision_count<>5 then raise exception 'Production review checklist is incomplete'; end if;
    if unresolved>0 then raise exception 'Human review decisions remain unresolved'; end if;
    if not new.mastery_reviewed then raise exception 'Mastery relationship remains unresolved'; end if;
    if new.content_fingerprint<>public.lesson_personalization_content_fingerprint(lesson_row) then raise exception 'Lesson content fingerprint is stale'; end if;
    if cardinality(errors)>0 then raise exception 'Metadata cannot be approved: %',array_to_string(errors,'; '); end if;
    new.approved_content_fingerprint:=new.content_fingerprint;new.metadata_stale:=false;
  end if;
  return new;
end;$$;
revoke all on function public.enforce_lesson_personalization_metadata_approval() from public,anon,authenticated;

create index lesson_personalization_decisions_queue_idx on public.lesson_personalization_review_decisions(lesson_id,requires_human,decision_status);
commit;
