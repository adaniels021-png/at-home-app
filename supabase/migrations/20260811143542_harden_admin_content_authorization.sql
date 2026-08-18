-- Phase 9F.2: replace legacy email/public Content Studio authorization with
-- server-enforced app_admins membership. Parent-facing approved-content reads
-- and the parent-owned activity_queue workflow are intentionally preserved.

begin;

-- Supabase may materialize an explicit anon function grant from default
-- privileges even after PUBLIC is revoked. The RPC is authenticated-only.
revoke all on function public.is_app_admin() from public;
revoke all on function public.is_app_admin() from anon;
grant execute on function public.is_app_admin() to authenticated;

-- lesson_library: preserve the approved/active authenticated SELECT policy.
drop policy if exists "Admin can insert lessons" on public.lesson_library;
drop policy if exists "Admin can read all lessons" on public.lesson_library;
drop policy if exists "Admin can update lessons" on public.lesson_library;

create policy "App admins can insert lessons"
on public.lesson_library
for insert
to authenticated
with check (public.is_app_admin());

create policy "App admins can read all lessons"
on public.lesson_library
for select
to authenticated
using (public.is_app_admin());

create policy "App admins can update lessons"
on public.lesson_library
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "App admins can delete lessons"
on public.lesson_library
for delete
to authenticated
using (public.is_app_admin());

-- activity_queue: keep "Users can manage their activity queue" so parents can
-- continue managing rows owned through their child_profiles relationship.
drop policy if exists "Admin can delete activity queue" on public.activity_queue;
drop policy if exists "Admin can insert activity queue" on public.activity_queue;
drop policy if exists "Admin can read activity queue" on public.activity_queue;
drop policy if exists "Admin can update activity queue" on public.activity_queue;

create policy "App admins can delete activity queue"
on public.activity_queue
for delete
to authenticated
using (public.is_app_admin());

create policy "App admins can insert activity queue"
on public.activity_queue
for insert
to authenticated
with check (public.is_app_admin());

create policy "App admins can read activity queue"
on public.activity_queue
for select
to authenticated
using (public.is_app_admin());

create policy "App admins can update activity queue"
on public.activity_queue
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

-- activity_library: current parent-facing code reads approved rows only. The
-- repository contains no parent write workflow for the legacy contributor
-- policies, and the unconditional authenticated UPDATE policy is unsafe.
drop policy if exists "Admin can delete activities" on public.activity_library;
drop policy if exists "Admin can insert activities" on public.activity_library;
drop policy if exists "Admin can update activities" on public.activity_library;
drop policy if exists "Authenticated users can insert activities" on public.activity_library;
drop policy if exists "Authenticated users can update activities" on public.activity_library;
drop policy if exists "Users can delete their own pending activities" on public.activity_library;
drop policy if exists "Users can update their own pending activities" on public.activity_library;

create policy "App admins can read all activities"
on public.activity_library
for select
to authenticated
using (public.is_app_admin());

create policy "App admins can insert activities"
on public.activity_library
for insert
to authenticated
with check (public.is_app_admin());

create policy "App admins can update activities"
on public.activity_library
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "App admins can delete activities"
on public.activity_library
for delete
to authenticated
using (public.is_app_admin());

-- worksheet_library: preserve all public/family approved-content SELECT
-- policies while replacing every permissive write policy and legacy Admin
-- read policy.
drop policy if exists "Admin can delete worksheets" on public.worksheet_library;
drop policy if exists "Authenticated users can delete worksheets" on public.worksheet_library;
drop policy if exists "worksheet_admin_delete" on public.worksheet_library;
drop policy if exists "Admin can insert worksheets" on public.worksheet_library;
drop policy if exists "Authenticated users can insert worksheets" on public.worksheet_library;
drop policy if exists "worksheet_admin_insert" on public.worksheet_library;
drop policy if exists "Admin can update worksheets" on public.worksheet_library;
drop policy if exists "Authenticated users can update worksheets" on public.worksheet_library;
drop policy if exists "worksheet_admin_update" on public.worksheet_library;
drop policy if exists "Admin can view all worksheets" on public.worksheet_library;
drop policy if exists "worksheet_admin_select_all" on public.worksheet_library;

create policy "App admins can read all worksheets"
on public.worksheet_library
for select
to authenticated
using (public.is_app_admin());

create policy "App admins can insert worksheets"
on public.worksheet_library
for insert
to authenticated
with check (public.is_app_admin());

create policy "App admins can update worksheets"
on public.worksheet_library
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "App admins can delete worksheets"
on public.worksheet_library
for delete
to authenticated
using (public.is_app_admin());

-- ai_assets is an Admin Content Studio catalog. Public reads remain available
-- because generated content consumes its public asset URLs.
drop policy if exists "ai_assets_public_insert" on public.ai_assets;
drop policy if exists "ai_assets_public_update" on public.ai_assets;
drop policy if exists "ai_assets_public_delete" on public.ai_assets;

create policy "App admins can insert AI assets"
on public.ai_assets
for insert
to authenticated
with check (public.is_app_admin());

create policy "App admins can update AI assets"
on public.ai_assets
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "App admins can delete AI assets"
on public.ai_assets
for delete
to authenticated
using (public.is_app_admin());

-- Only worksheet-files and worksheet-art are used by current Content Studio
-- storage workflows. Their public SELECT policies and public buckets remain
-- unchanged so existing worksheet URLs continue to work.
drop policy if exists "Authenticated users upload worksheet files" on storage.objects;
drop policy if exists "Authenticated users update worksheet files" on storage.objects;
drop policy if exists "Authenticated users delete worksheet files" on storage.objects;
drop policy if exists "worksheet_files_insert" on storage.objects;
drop policy if exists "worksheet_files_update" on storage.objects;
drop policy if exists "worksheet_files_delete" on storage.objects;
drop policy if exists "worksheet_art_public_insert" on storage.objects;
drop policy if exists "worksheet_art_public_update" on storage.objects;
drop policy if exists "worksheet_art_public_delete" on storage.objects;

create policy "App admins can insert worksheet files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worksheet-files'
  and public.is_app_admin()
);

create policy "App admins can update worksheet files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'worksheet-files'
  and public.is_app_admin()
)
with check (
  bucket_id = 'worksheet-files'
  and public.is_app_admin()
);

create policy "App admins can delete worksheet files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'worksheet-files'
  and public.is_app_admin()
);

create policy "App admins can insert worksheet art"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worksheet-art'
  and public.is_app_admin()
);

create policy "App admins can update worksheet art"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'worksheet-art'
  and public.is_app_admin()
)
with check (
  bucket_id = 'worksheet-art'
  and public.is_app_admin()
);

create policy "App admins can delete worksheet art"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'worksheet-art'
  and public.is_app_admin()
);

commit;
