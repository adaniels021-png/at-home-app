-- Phase 9F.5: conservative prerequisite classification, exception-first tiers,
-- and content-fingerprint invalidation. No lesson or metadata is approved here.
begin;

alter table public.lesson_personalization_metadata
  add column prerequisite_review_state text not null default 'ambiguous',
  add column prerequisite_classifier_reason text,
  add column review_tier text not null default 'detailed_review',
  add column review_tier_reasons jsonb not null default '[]'::jsonb,
  add column content_fingerprint text,
  add column approved_content_fingerprint text,
  add column metadata_stale boolean not null default false;

alter table public.lesson_personalization_metadata
  add constraint lesson_metadata_prerequisite_state_check check (
    prerequisite_review_state in ('no_prerequisite_deterministic','candidate_needs_confirmation','confirmed','rejected','ambiguous')
  ),
  add constraint lesson_metadata_review_tier_check check (
    review_tier in ('quick_confirmation','focused_review','detailed_review','content_dependent')
  ),
  add constraint lesson_metadata_tier_reasons_array_check check (jsonb_typeof(review_tier_reasons)='array');

create or replace function public.lesson_personalization_content_fingerprint(p public.lesson_library)
returns text language sql immutable set search_path=pg_catalog,public as $$
  select md5(concat_ws(chr(31),
    coalesce(p.title,''),coalesce(p.category,''),coalesce(p.skill_area,''),coalesce(p.stage_number::text,''),
    coalesce(p.stage_name,''),coalesce(p.difficulty,''),coalesce(p.description,''),coalesce(p.goal,''),
    coalesce(array_to_string(p.materials,chr(30)),''),coalesce(array_to_string(p.steps,chr(30)),''),
    coalesce(array_to_string(p.caregiver_tips,chr(30)),''),coalesce(p.why_skill_matters,''),
    coalesce(p.setup_instructions,''),coalesce(p.parent_script,''),coalesce(p.expected_child_response,''),
    coalesce(array_to_string(p.prompting_tips,chr(30)),''),coalesce(array_to_string(p.reinforcement_tips,chr(30)),''),
    coalesce(array_to_string(p.if_child_struggles,chr(30)),''),coalesce(p.easy_version,''),coalesce(p.harder_version,''),
    coalesce(array_to_string(p.generalization_ideas,chr(30)),''),coalesce(array_to_string(p.safety_notes,chr(30)),''),
    coalesce(p.success_criteria,'')
  ));
$$;
revoke all on function public.lesson_personalization_content_fingerprint(public.lesson_library) from public,anon,authenticated;

create or replace function public.lesson_personalization_review_tier(p public.lesson_personalization_metadata)
returns text language plpgsql stable set search_path=pg_catalog,public as $$
declare content_status text; exceptions integer:=0;
begin
  select quality_status into content_status from public.lesson_library where id=p.lesson_id;
  if content_status='needs_revision' then return 'content_dependent'; end if;
  if p.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' and not p.communication_reviewed then exceptions:=exceptions+1; end if;
  if (p.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED' or p.material_activity_tags && array['material.food','risk.allergy_relevant','risk.small_objects','activity.water','sensory.loud_sound','sensory.bright_visual','sensory.messy_texture','activity.physical_contact','activity.movement','risk.fast_spinning','activity.community']::text[]) and not p.safety_reviewed then exceptions:=exceptions+1; end if;
  if p.candidate_warnings ? 'DUPLICATE_REVIEW' and not p.duplicate_reviewed then exceptions:=exceptions+1; end if;
  if p.prerequisite_review_state not in ('no_prerequisite_deterministic','confirmed','rejected') then exceptions:=exceptions+1; end if;
  if p.metadata_stale then exceptions:=exceptions+1; end if;
  if (p.candidate_warnings ? 'DUPLICATE_REVIEW' and not p.duplicate_reviewed) or exceptions>=2 then return 'detailed_review'; end if;
  if exceptions=1 or p.candidate_confidence='LOW' then return 'focused_review'; end if;
  return 'quick_confirmation';
end;$$;
revoke all on function public.lesson_personalization_review_tier(public.lesson_personalization_metadata) from public,anon,authenticated;

-- Extend the existing server validator without changing its canonical-code logic.
do $$
declare definition text; corrected text;
begin
  select pg_get_functiondef('public.lesson_personalization_validation_errors(public.lesson_personalization_metadata)'::regprocedure) into definition;
  corrected:=replace(definition,
    'if not p.prerequisite_reviewed then e:=array_append(e,''Prerequisite review is unresolved.''); end if;',
    'if not p.prerequisite_reviewed or p.prerequisite_review_state not in (''no_prerequisite_deterministic'',''confirmed'',''rejected'') then e:=array_append(e,''Prerequisite review is unresolved.''); end if; if p.material_activity_tags && array[''material.food'',''risk.allergy_relevant'',''risk.small_objects'',''activity.water'',''sensory.loud_sound'',''sensory.bright_visual'',''sensory.messy_texture'',''activity.physical_contact'',''activity.movement'',''risk.fast_spinning'',''activity.community'']::text[] and not p.safety_reviewed then e:=array_append(e,''Material/activity safety review is unresolved.''); end if; if p.metadata_stale then e:=array_append(e,''Lesson content changed after metadata review.''); end if;');
  if corrected=definition then raise exception 'Prerequisite validator pattern not found'; end if;
  execute corrected;

  select pg_get_functiondef('public.review_lesson_personalization_metadata(uuid,jsonb,text,text)'::regprocedure) into definition;
  corrected:=replace(definition,
    '''prerequisite_reviewed'',''duplicate_reviewed''',
    '''prerequisite_reviewed'',''prerequisite_review_state'',''duplicate_reviewed''');
  corrected:=replace(corrected,
    'prerequisite_reviewed=case when p_patch?''prerequisite_reviewed'' then (p_patch->>''prerequisite_reviewed'')::boolean else m.prerequisite_reviewed end,',
    'prerequisite_reviewed=case when p_patch?''prerequisite_reviewed'' then (p_patch->>''prerequisite_reviewed'')::boolean else m.prerequisite_reviewed end, prerequisite_review_state=case when p_patch?''prerequisite_review_state'' then p_patch->>''prerequisite_review_state'' else m.prerequisite_review_state end,');
  if corrected=definition then raise exception 'Review RPC prerequisite-state patterns not found'; end if;
  execute corrected;
end;$$;

create or replace function public.enforce_lesson_personalization_metadata_approval()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare errors text[]; lesson_row public.lesson_library;
begin
  select * into lesson_row from public.lesson_library where id=new.lesson_id;
  if lesson_row.id is null then raise exception 'Lesson not found'; end if;
  if new.content_fingerprint is null then new.content_fingerprint:=public.lesson_personalization_content_fingerprint(lesson_row); end if;
  new.prerequisite_reviewed:=new.prerequisite_review_state in ('no_prerequisite_deterministic','confirmed','rejected');
  new.review_tier:=public.lesson_personalization_review_tier(new);
  new.review_tier_reasons:=to_jsonb(array_remove(array[
    case when new.candidate_warnings ? 'COMMUNICATION_REVIEW_REQUIRED' and not new.communication_reviewed then 'communication' end,
    case when (new.candidate_warnings ? 'SAFETY_REVIEW_REQUIRED' or new.material_activity_tags && array['material.food','risk.allergy_relevant','risk.small_objects','activity.water','sensory.loud_sound','sensory.bright_visual','sensory.messy_texture','activity.physical_contact','activity.movement','risk.fast_spinning','activity.community']::text[]) and not new.safety_reviewed then 'safety_material' end,
    case when new.candidate_warnings ? 'DUPLICATE_REVIEW' and not new.duplicate_reviewed then 'duplicate_progression' end,
    case when new.prerequisite_review_state not in ('no_prerequisite_deterministic','confirmed','rejected') then 'prerequisite' end,
    case when new.metadata_stale then 'content_fingerprint_changed' end
  ],null));
  errors:=public.lesson_personalization_validation_errors(new);
  new.validation_errors:=to_jsonb(errors);new.updated_at:=now();
  if new.review_status='approved' and cardinality(errors)>0 then raise exception 'Metadata cannot be approved: %',array_to_string(errors,'; '); end if;
  if new.review_status='approved' then new.approved_content_fingerprint:=new.content_fingerprint;new.metadata_stale:=false; end if;
  return new;
end;$$;
revoke all on function public.enforce_lesson_personalization_metadata_approval() from public,anon,authenticated;

create or replace function public.invalidate_lesson_metadata_after_content_change()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare old_hash text;new_hash text;
begin
  old_hash:=public.lesson_personalization_content_fingerprint(old);new_hash:=public.lesson_personalization_content_fingerprint(new);
  if old_hash=new_hash then return new; end if;
  perform set_config('app.metadata_review_action','content_fingerprint_invalidation',true);
  update public.lesson_personalization_metadata set
    content_fingerprint=new_hash,
    metadata_stale=(review_status='approved'),
    review_status=case when review_status='approved' then 'needs_review' else review_status end,
    review_reason=case when review_status='approved' then 'Metadata approval invalidated by a relevant lesson-content change.' else review_reason end
  where lesson_id=new.id;
  return new;
end;$$;
revoke all on function public.invalidate_lesson_metadata_after_content_change() from public,anon,authenticated;
create trigger invalidate_lesson_metadata_after_content_change_trigger
after update of title,category,skill_area,stage_number,stage_name,difficulty,description,goal,materials,steps,caregiver_tips,why_skill_matters,setup_instructions,parent_script,expected_child_response,prompting_tips,reinforcement_tips,if_child_struggles,easy_version,harder_version,generalization_ideas,safety_notes,success_criteria
on public.lesson_library for each row execute function public.invalidate_lesson_metadata_after_content_change();

-- Deterministic, non-approval classification. Beginning-stage lessons without
-- prerequisite candidates or progression warnings can safely record "none".
alter table public.lesson_personalization_metadata disable trigger lesson_personalization_metadata_history_trigger;
update public.lesson_personalization_metadata m set
  prerequisite_review_state=case when m.skill_stage_code='beginning' and cardinality(m.prerequisite_skill_codes)=0 and not (m.candidate_warnings ? 'DUPLICATE_REVIEW') then 'no_prerequisite_deterministic' else 'ambiguous' end,
  prerequisite_classifier_reason=case when m.skill_stage_code='beginning' and cardinality(m.prerequisite_skill_codes)=0 and not (m.candidate_warnings ? 'DUPLICATE_REVIEW') then 'Beginning-stage foundational target with no candidate prerequisite or progression warning.' else 'Non-beginning or progression-sensitive lesson requires human prerequisite confirmation.' end,
  content_fingerprint=public.lesson_personalization_content_fingerprint(l)
from public.lesson_library l where l.id=m.lesson_id;
alter table public.lesson_personalization_metadata enable trigger lesson_personalization_metadata_history_trigger;

create index lesson_personalization_metadata_tier_idx on public.lesson_personalization_metadata(review_tier,review_status);
commit;
