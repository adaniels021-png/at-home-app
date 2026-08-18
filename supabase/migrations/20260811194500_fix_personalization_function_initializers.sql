-- Phase 9F.4 lint-only fix: make empty PL/pgSQL initializer casts explicit.
begin;

do $$
declare
  definition text;
  corrected text;
begin
  select pg_get_functiondef(
    'public.lesson_personalization_validation_errors(public.lesson_personalization_metadata)'::regprocedure
  ) into definition;
  corrected := replace(
    definition,
    'declare e text[]:=''{}'';',
    'declare e text[]:=''{}''::text[];'
  );
  if corrected = definition then
    raise exception 'Validation-function initializer pattern was not found';
  end if;
  execute corrected;

  select pg_get_functiondef(
    'public.approve_lesson_personalization_metadata_batch(uuid[])'::regprocedure
  ) into definition;
  corrected := replace(
    definition,
    'results jsonb:=''[]'';',
    'results jsonb:=''[]''::jsonb;'
  );
  if corrected = definition then
    raise exception 'Batch-function initializer pattern was not found';
  end if;
  execute corrected;
end;
$$;

commit;
