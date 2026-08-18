-- Phase 4D.1: draft-safe personalization review and atomic lesson finalization.
begin;

alter table public.lesson_personalization_metadata
  add column support_level text check (support_level is null or support_level in ('more_support','balanced_support','less_support')),
  add column support_level_reviewed boolean not null default false,
  add column content_review_status text not null default 'pending' check (content_review_status in ('pending','approved','needs_revision'));

comment on column public.lesson_personalization_metadata.support_level is
  'Human-reviewed support demand; independent of lesson difficulty and curriculum stage.';
comment on table public.lesson_personalization_metadata is
  'Canonical live source for reviewed personalization metadata. Static repository artifacts are candidates only.';

create or replace function public.generate_lesson_personalization_decisions(p_lesson_id uuid)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.lesson_personalization_metadata;l public.lesson_library; inserted integer;
begin
 if not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
 select * into l from public.lesson_library where id=p_lesson_id for update;
 if l.id is null then raise exception 'Lesson not found'; end if;
 select * into m from public.lesson_personalization_metadata where lesson_id=p_lesson_id and metadata_version=1 for update;
 if m.id is null then raise exception 'Metadata not found'; end if;
 if m.content_fingerprint<>public.lesson_personalization_content_fingerprint(l) or m.metadata_stale then raise exception 'Lesson content fingerprint is stale'; end if;
 if exists(select 1 from public.lesson_personalization_review_decisions where metadata_id=m.id) then
   if (select count(*) from public.lesson_personalization_review_decisions where metadata_id=m.id)<>5 then raise exception 'Existing decision set is incomplete'; end if;
   return 0;
 end if;
 perform set_config('app.metadata_review_action','draft_decision_generation',true);
 insert into public.lesson_personalization_review_decisions(metadata_id,lesson_id,decision_key,decision_category,classification,requires_human,decision_status,plain_language_summary,prompt,recommendation,rationale,candidate_value,final_value,provenance)
 values
 (m.id,l.id,'communication','communication',case when m.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' or m.target_skill_code like 'communication.%' then 'communication_review' else 'communication_mode_irrelevant' end,case when m.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' or m.target_skill_code like 'communication.%' then true else false end,case when m.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' or m.target_skill_code like 'communication.%' then 'unresolved' else 'resolved_deterministic' end,'Confirm that response modes match the lesson without privileging speech.','Do the listed response modes accurately represent valid participation?','Preserve AAC, sign, gesture, pictures, pointing, showing, and established communication methods when relevant.','Review uses current remediated content and response-mode metadata.',jsonb_build_object('supported_response_modes',m.supported_response_modes),case when not (m.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' or m.target_skill_code like 'communication.%') then jsonb_build_object('response_requirement','action_or_not_applicable') end,case when m.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' or m.target_skill_code like 'communication.%' then 'generated_candidate' else 'deterministic_evidence' end),
 (m.id,l.id,'safety_material','safety_material',case when m.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED' then 'safety_review' else 'factual_material_review' end,m.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED',case when m.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED' then 'unresolved' else 'resolved_deterministic' end,'Confirm factual material and safety descriptors without inventing contraindications.','Are the material and safety tags accurate for the required activity?','Keep factual descriptors separate from contraindications.','Review uses current required materials and steps.',jsonb_build_object('material_activity_tags',m.material_activity_tags,'contraindication_tags',m.contraindication_tags),case when not (m.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED') then jsonb_build_object('review','no_unresolved_safety_warning') end,case when m.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED' then 'generated_candidate' else 'deterministic_evidence' end),
 (m.id,l.id,'prerequisite','prerequisite',case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'no_prerequisite_deterministic' else 'candidate_needs_confirmation' end,m.prerequisite_review_state<>'no_prerequisite_deterministic',case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'resolved_deterministic' else 'unresolved' end,'Decide whether an earlier ability is truly required.','Is an earlier ability required, helpful, or not a prerequisite?','Do not require a prerequisite unless the lesson cannot make sense without it.',coalesce(m.prerequisite_classifier_reason,'Current prerequisite candidate review.'),jsonb_build_object('current_hard_prerequisites',m.prerequisite_skill_codes),case when m.prerequisite_review_state='no_prerequisite_deterministic' then jsonb_build_object('relationship','none') end,case when m.prerequisite_review_state='no_prerequisite_deterministic' then 'deterministic_evidence' else 'generated_candidate' end),
 (m.id,l.id,'mastery','mastery',case when m.mastery_group=m.target_skill_code then 'specific_group_deterministic' else 'mastery_scope_review' end,m.mastery_group is distinct from m.target_skill_code,case when m.mastery_group=m.target_skill_code then 'resolved_deterministic' else 'unresolved' end,'Confirm that mastery suppresses only the intended specific skill group.','Does this mastery group match the lesson target?','Do not use a broad group that suppresses unrelated skills.','Target and mastery scope comparison.',jsonb_build_object('target_skill_code',m.target_skill_code,'mastery_group',m.mastery_group),case when m.mastery_group=m.target_skill_code then jsonb_build_object('mastery_group',m.mastery_group) end,case when m.mastery_group=m.target_skill_code then 'deterministic_evidence' else 'generated_candidate' end),
 (m.id,l.id,'duplicate_progression','duplicate_progression',case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'duplicate_progression_review' else 'none' end,m.candidate_warnings ? 'DUPLICATE_REVIEW',case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'unresolved' else 'resolved_deterministic' end,'Confirm whether this is distinct curriculum or intentional progression.','Is this an intentional progression, variant, duplicate, or content issue?','Do not merge or retire content through this decision.',coalesce(m.duplicate_classification,'No duplicate warning.'),jsonb_build_object('group_id',m.duplicate_group_id),case when not (m.candidate_warnings ? 'DUPLICATE_REVIEW') then '{}'::jsonb end,case when m.candidate_warnings ? 'DUPLICATE_REVIEW' then 'generated_candidate' else 'deterministic_evidence' end);
 get diagnostics inserted=row_count;
 if inserted<>5 then raise exception 'Expected five decisions, created %',inserted; end if;
 return inserted;
end;$$;
revoke all on function public.generate_lesson_personalization_decisions(uuid) from public,anon;
grant execute on function public.generate_lesson_personalization_decisions(uuid) to authenticated;

-- Draft lessons may be reviewed; visibility still depends exclusively on lesson RLS/status.
create or replace function public.review_production_lesson_metadata_decision(p_decision_id uuid,p_outcome text,p_final_value jsonb default '{}'::jsonb,p_reason text default null,p_review_method text default 'production_review')
returns public.lesson_personalization_review_decisions language plpgsql security definer set search_path=pg_catalog,public as $$
declare d public.lesson_personalization_review_decisions;meta public.lesson_personalization_metadata;l public.lesson_library;skill text;
begin
 if not public.is_app_admin() then raise exception 'Admin authorization required'; end if;
 select * into d from public.lesson_personalization_review_decisions where id=p_decision_id for update;if d.id is null then raise exception 'Decision not found';end if;
 select * into meta from public.lesson_personalization_metadata where id=d.metadata_id for update;
 select * into l from public.lesson_library where id=d.lesson_id;
 if meta.content_fingerprint<>public.lesson_personalization_content_fingerprint(l) or meta.metadata_stale then raise exception 'Lesson content fingerprint is stale';end if;
 if p_outcome in ('needs_more_review','needs_content_review') then d.decision_status:=case when p_outcome='needs_content_review' then 'content_dependent' else 'needs_more_review' end;d.provenance:=case when p_outcome='needs_content_review' then 'content_dependent' else 'human_confirmed' end;
 elsif p_outcome in ('edited','human_edited') then d.decision_status:='human_edited';d.provenance:='human_edited';
 else d.decision_status:='human_confirmed';d.provenance:='human_confirmed';end if;
 if d.decision_category='prerequisite' and p_outcome not in ('required','helpful','not_required','needs_more_review','needs_content_review','edited') then raise exception 'Invalid prerequisite outcome';end if;
 if d.decision_category<>'prerequisite' and p_outcome not in ('confirm_recommendation','speech_required','alternate_modes','human_confirmed','confirm_scope','intentional_progression','intentional_variant','likely_duplicate','needs_more_review','needs_content_review','edited') then raise exception 'Invalid outcome';end if;
 if d.decision_category='prerequisite' and p_outcome='required' then skill:=coalesce(p_final_value->>'skill_code',d.candidate_value->>'suggested_skill_code');if skill is null or skill=meta.target_skill_code then raise exception 'Valid distinct prerequisite skill required';end if;end if;
 perform set_config('app.metadata_review_action',p_review_method,true);
 update public.lesson_personalization_review_decisions set decision_status=d.decision_status,final_value=coalesce(p_final_value,'{}'::jsonb)||jsonb_build_object('outcome',p_outcome),provenance=d.provenance,reviewer_user_id=auth.uid(),reviewed_at=now(),review_reason=p_reason,updated_at=now() where id=d.id returning * into d;
 update public.lesson_personalization_metadata m set
 communication_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=m.id and x.decision_category='communication' and x.decision_status not in ('resolved_deterministic','human_confirmed','human_edited')),
 safety_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=m.id and x.decision_category='safety_material' and x.decision_status not in ('resolved_deterministic','human_confirmed','human_edited')),
 mastery_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=m.id and x.decision_category='mastery' and x.decision_status not in ('resolved_deterministic','human_confirmed','human_edited')),
 duplicate_reviewed=not exists(select 1 from public.lesson_personalization_review_decisions x where x.metadata_id=m.id and x.decision_category='duplicate_progression' and x.decision_status not in ('resolved_deterministic','human_confirmed','human_edited')),
 prerequisite_review_state=case when d.decision_category='prerequisite' and p_outcome='required' then 'confirmed' when d.decision_category='prerequisite' and p_outcome in ('helpful','not_required') then 'rejected' when d.decision_category='prerequisite' then 'ambiguous' else m.prerequisite_review_state end,
 prerequisite_skill_codes=case when d.decision_category='prerequisite' and p_outcome='required' then array[skill] when d.decision_category='prerequisite' and p_outcome in ('helpful','not_required') then '{}'::text[] else m.prerequisite_skill_codes end,last_review_method=p_review_method where m.id=d.metadata_id;
 return d;
end;$$;
revoke all on function public.review_production_lesson_metadata_decision(uuid,text,jsonb,text,text) from public,anon;
grant execute on function public.review_production_lesson_metadata_decision(uuid,text,jsonb,text,text) to authenticated;

create or replace function public.review_draft_lesson_personalization_metadata(p_metadata_id uuid,p_patch jsonb,p_review_reason text default null)
returns public.lesson_personalization_metadata language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.lesson_personalization_metadata;k text;
begin
 if not public.is_app_admin() then raise exception 'Admin authorization required';end if;
 for k in select jsonb_object_keys(p_patch) loop
   if k<>all(array['target_skill_code','mastery_group','skill_stage_code','prerequisite_skill_codes','assessment_need_tags','supported_response_modes','min_communication_complexity','max_communication_complexity','min_independence_level','max_independence_level','contraindication_tags','material_activity_tags','universal_safe_fallback','support_level','support_level_reviewed','content_review_status']::text[]) then raise exception 'Unsupported metadata field: %',k;end if;
 end loop;
 perform set_config('app.metadata_review_action','draft_metadata_review',true);
 update public.lesson_personalization_metadata x set
 target_skill_code=case when p_patch?'target_skill_code' then p_patch->>'target_skill_code' else x.target_skill_code end,
 mastery_group=case when p_patch?'mastery_group' then p_patch->>'mastery_group' else x.mastery_group end,
 skill_stage_code=case when p_patch?'skill_stage_code' then p_patch->>'skill_stage_code' else x.skill_stage_code end,
 prerequisite_skill_codes=case when p_patch?'prerequisite_skill_codes' then array(select jsonb_array_elements_text(p_patch->'prerequisite_skill_codes')) else x.prerequisite_skill_codes end,
 assessment_need_tags=case when p_patch?'assessment_need_tags' then array(select jsonb_array_elements_text(p_patch->'assessment_need_tags')) else x.assessment_need_tags end,
 supported_response_modes=case when p_patch?'supported_response_modes' then array(select jsonb_array_elements_text(p_patch->'supported_response_modes')) else x.supported_response_modes end,
 min_communication_complexity=case when p_patch?'min_communication_complexity' then p_patch->>'min_communication_complexity' else x.min_communication_complexity end,
 max_communication_complexity=case when p_patch?'max_communication_complexity' then p_patch->>'max_communication_complexity' else x.max_communication_complexity end,
 min_independence_level=case when p_patch?'min_independence_level' then p_patch->>'min_independence_level' else x.min_independence_level end,
 max_independence_level=case when p_patch?'max_independence_level' then p_patch->>'max_independence_level' else x.max_independence_level end,
 contraindication_tags=case when p_patch?'contraindication_tags' then array(select jsonb_array_elements_text(p_patch->'contraindication_tags')) else x.contraindication_tags end,
 material_activity_tags=case when p_patch?'material_activity_tags' then array(select jsonb_array_elements_text(p_patch->'material_activity_tags')) else x.material_activity_tags end,
 universal_safe_fallback=case when p_patch?'universal_safe_fallback' then (p_patch->>'universal_safe_fallback')::boolean else x.universal_safe_fallback end,
 support_level=case when p_patch?'support_level' then p_patch->>'support_level' else x.support_level end,
 support_level_reviewed=case when p_patch?'support_level_reviewed' then (p_patch->>'support_level_reviewed')::boolean else x.support_level_reviewed end,
 content_review_status=case when p_patch?'content_review_status' then p_patch->>'content_review_status' else x.content_review_status end,
 review_reason=p_review_reason,reviewed_by=auth.uid(),updated_at=now()
 where x.id=p_metadata_id returning * into m;
 if m.id is null then raise exception 'Metadata not found';end if;
 return m;
end;$$;
revoke all on function public.review_draft_lesson_personalization_metadata(uuid,jsonb,text) from public,anon;
grant execute on function public.review_draft_lesson_personalization_metadata(uuid,jsonb,text) to authenticated;

create or replace function public.guard_atomic_lesson_approval() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if new.quality_status='approved' and old.quality_status is distinct from 'approved' and exists(select 1 from public.lesson_personalization_metadata where lesson_id=new.id) and current_setting('app.atomic_lesson_finalization',true)<>'allowed' then raise exception 'Use atomic lesson personalization finalization';end if;
 return new;
end;$$;
revoke all on function public.guard_atomic_lesson_approval() from public,anon,authenticated;
create trigger guard_atomic_lesson_approval_trigger before update of quality_status on public.lesson_library for each row execute function public.guard_atomic_lesson_approval();

create or replace function public.finalize_lesson_and_personalization(p_lesson_id uuid,p_review_method text default 'atomic_finalization') returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.lesson_library;m public.lesson_personalization_metadata;errors text[];n integer;distinct_n integer;unresolved integer;
begin
 if not public.is_app_admin() then raise exception 'Admin authorization required';end if;
 select * into l from public.lesson_library where id=p_lesson_id for update;if l.id is null then raise exception 'Lesson not found';end if;
 if l.quality_status='approved' then raise exception 'Lesson is already approved';end if;
 select * into m from public.lesson_personalization_metadata where lesson_id=l.id and metadata_version=1 for update;if m.id is null then raise exception 'Metadata not found';end if;
 if m.content_review_status<>'approved' then raise exception 'Content review is not approved';end if;
 if m.support_level is null or not m.support_level_reviewed then raise exception 'Support level is not reviewed';end if;
 if m.content_fingerprint<>public.lesson_personalization_content_fingerprint(l) or m.metadata_stale then raise exception 'Lesson content fingerprint is stale';end if;
 select count(*),count(distinct decision_key),count(*) filter(where decision_status not in ('resolved_deterministic','human_confirmed','human_edited')) into n,distinct_n,unresolved from public.lesson_personalization_review_decisions where metadata_id=m.id;
 if n<>5 or distinct_n<>5 or exists(select 1 from unnest(array['communication','safety_material','prerequisite','mastery','duplicate_progression']::text[]) k where not exists(select 1 from public.lesson_personalization_review_decisions d where d.metadata_id=m.id and d.decision_key=k)) then raise exception 'Exactly five distinct canonical decisions are required';end if;if unresolved<>0 then raise exception '% decisions remain unresolved',unresolved;end if;
 errors:=public.lesson_personalization_validation_errors(m);if cardinality(errors)>0 then raise exception 'Metadata validation failed: %',array_to_string(errors,'; ');end if;
 perform set_config('app.atomic_lesson_finalization','allowed',true);perform set_config('app.metadata_review_action',p_review_method,true);
 update public.lesson_library set quality_status='approved',reviewed_by=auth.uid()::text,reviewed_at=now(),updated_at=now() where id=l.id;
 update public.lesson_personalization_metadata set review_status='approved',reviewed_by=auth.uid(),reviewed_at=now(),last_review_method=p_review_method where id=m.id returning * into m;
 return jsonb_build_object('lesson_id',l.id,'lesson_quality_status','approved','metadata_review_status',m.review_status,'support_level',m.support_level);
end;$$;
revoke all on function public.finalize_lesson_and_personalization(uuid,text) from public,anon;
grant execute on function public.finalize_lesson_and_personalization(uuid,text) to authenticated;

commit;
