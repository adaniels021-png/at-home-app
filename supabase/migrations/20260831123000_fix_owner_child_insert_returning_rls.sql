begin;

-- Owner creation already has a narrow INSERT check (parent_id = auth.uid()).
-- Add the same canonical owner condition directly to SELECT visibility so an
-- INSERT ... RETURNING representation can see the row created by that
-- statement. The existing child-scoped caregiver access check is preserved.
drop policy if exists "Users read authorized children only" on public.children;

create policy "Users read authorized children only"
on public.children
for select
to authenticated
using (
  parent_id = auth.uid()
  or public.has_child_access(id)
);

commit;
