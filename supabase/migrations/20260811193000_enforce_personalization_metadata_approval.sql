-- Phase 9F.4 hardening: validation is enforced even for direct Admin table writes.
begin;

create or replace function public.enforce_lesson_personalization_metadata_approval()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  errors text[];
begin
  errors := public.lesson_personalization_validation_errors(new);
  new.validation_errors := to_jsonb(errors);
  new.updated_at := now();

  if new.review_status = 'approved' and cardinality(errors) > 0 then
    raise exception 'Metadata cannot be approved: %', array_to_string(errors, '; ');
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_lesson_personalization_metadata_approval()
from public, anon, authenticated;

create trigger enforce_lesson_personalization_metadata_approval_trigger
before insert or update on public.lesson_personalization_metadata
for each row execute function public.enforce_lesson_personalization_metadata_approval();

commit;
