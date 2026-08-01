-- Configure fail-closed `pro_only` availability for activities.
-- Worksheets intentionally retain their existing `is_pro` schema.

-- Activities and review drafts default to premium. Review drafts carry the
-- flag into the approved library when published.
alter table public.activity_library
  add column if not exists pro_only boolean not null default true;

alter table public.activity_queue
  add column if not exists pro_only boolean not null default true;

update public.activity_library
set pro_only = true;

update public.activity_queue
set pro_only = true;

-- Pillow Fort plus one deterministic approved library activity are the two
-- permanent Free samples. Abort rather than silently granting the wrong set.
do $$
declare
  updated_activity_count integer;
begin
  with free_activity_ids as (
    (select id
      from public.activity_library
      where lower(trim(title)) = 'pillow fort'
        and status = 'approved'
      order by created_at asc nulls last, id
      limit 1)
    union all
    (select id
      from public.activity_library
      where lower(trim(title)) <> 'pillow fort'
        and status = 'approved'
      order by created_at asc nulls last, id
      limit 1)
  )
  update public.activity_library
  set pro_only = false
  where id in (select id from free_activity_ids);

  get diagnostics updated_activity_count = row_count;

  if updated_activity_count <> 2 then
    raise exception
      'Expected Pillow Fort and one additional approved activity before configuring Free samples.';
  end if;
end
$$;
