do $$
declare
  expected_free_lesson_ids uuid[] := array[
    '4c421463-e77d-458c-afcb-c4d80e1bca53'::uuid,
    '932463a0-cd66-4e03-86d3-178d5ecf038a'::uuid,
    'df1059ee-c34b-4ff2-90c4-14c5e609a847'::uuid
  ];
  matching_lesson_count integer;
begin
  select count(*)
  into matching_lesson_count
  from public.lesson_library
  where id = any(expected_free_lesson_ids);

  if matching_lesson_count <> cardinality(expected_free_lesson_ids) then
    raise exception
      'Expected all three free introductory lessons to exist; found % of %.',
      matching_lesson_count,
      cardinality(expected_free_lesson_ids);
  end if;

  update public.lesson_library
  set pro_only = true
  where pro_only is distinct from true;

  update public.lesson_library
  set pro_only = false
  where id = any(expected_free_lesson_ids);
end
$$;

-- New lessons fail closed unless an Admin explicitly makes them Free.
alter table public.lesson_library
  alter column pro_only set default true;
