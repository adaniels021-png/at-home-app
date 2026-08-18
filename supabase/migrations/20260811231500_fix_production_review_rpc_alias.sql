-- Phase 9F.6 corrective migration: remove PL/pgSQL record/alias ambiguity.
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
  if p_outcome='needs_more_review' then d.decision_status:='needs_more_review';d.provenance:='human_confirmed';
  elsif p_outcome in ('edited','human_edited') then d.decision_status:='human_edited';d.provenance:='human_edited';
  else d.decision_status:='human_confirmed';d.provenance:='human_confirmed'; end if;
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
    human_decision_summary=(select jsonb_object_agg(x.decision_key,jsonb_build_object('classification',x.classification,'status',x.decision_status,'provenance',x.provenance,'final_value',x.final_value,'recommendation',x.recommendation)) from public.lesson_personalization_review_decisions x where x.metadata_id=meta.id),last_review_method=p_review_method
  where meta.id=d.metadata_id;
  return d;
end;$$;
revoke all on function public.review_production_lesson_metadata_decision(uuid,text,jsonb,text,text) from public,anon;
grant execute on function public.review_production_lesson_metadata_decision(uuid,text,jsonb,text,text) to authenticated;
