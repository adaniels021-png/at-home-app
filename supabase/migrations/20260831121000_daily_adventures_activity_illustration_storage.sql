-- Phase C.3 Storage buckets. Local only until separately authorized.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('activity-illustration-drafts', 'activity-illustration-drafts', false, 768000, array['image/webp']),
  ('activity-illustrations', 'activity-illustrations', true, 768000, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Intentionally no anon/authenticated INSERT, UPDATE, or DELETE policies.
-- Drafts have no direct read policy. Admin preview is issued by a verified
-- server action as a short-lived signed URL. The public bucket provides read
-- access only to immutable approved paths written by the service pipeline.

commit;
