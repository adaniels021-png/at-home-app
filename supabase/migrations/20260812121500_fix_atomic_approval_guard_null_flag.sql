-- Phase 4D.1 corrective: a missing transaction flag must deny direct approval.
begin;

create or replace function public.guard_atomic_lesson_approval()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.quality_status='approved'
    and old.quality_status is distinct from 'approved'
    and exists(select 1 from public.lesson_personalization_metadata where lesson_id=new.id)
    and coalesce(current_setting('app.atomic_lesson_finalization',true),'')<>'allowed'
  then
    raise exception 'Use atomic lesson personalization finalization';
  end if;
  return new;
end;$$;

revoke all on function public.guard_atomic_lesson_approval() from public,anon,authenticated;

commit;
