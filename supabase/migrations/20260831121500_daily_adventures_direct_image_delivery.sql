-- Daily Adventures C.3 direct provider-image delivery.
-- This changes only illustration byte limits and the two dedicated buckets.

begin;

alter table public.activity_illustrations
  drop constraint activity_illustrations_byte_size_check;

alter table public.activity_illustrations
  add constraint activity_illustrations_byte_size_check
  check (byte_size is null or byte_size between 1 and 5242880);

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id in ('activity-illustration-drafts', 'activity-illustrations');

commit;
