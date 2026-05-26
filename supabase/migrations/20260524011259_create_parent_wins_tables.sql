create table if not exists public.parent_win_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  content text not null,
  status text not null default 'pending',
  report_count integer not null default 0,
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_win_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.parent_win_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique(post_id, user_id, reaction_type)
);

create table if not exists public.parent_win_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.parent_win_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.parent_win_hidden_posts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.parent_win_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.parent_win_posts enable row level security;
alter table public.parent_win_reactions enable row level security;
alter table public.parent_win_reports enable row level security;
alter table public.parent_win_hidden_posts enable row level security;
alter table public.admin_users enable row level security;

create policy "Users can create parent win posts"
on public.parent_win_posts
for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending');

create policy "Users can view approved unexpired parent win posts"
on public.parent_win_posts
for select
to authenticated
using (
  status = 'approved'
  and expires_at > now()
);

create policy "Admins can view all parent win posts"
on public.parent_win_posts
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.id = auth.uid()
  )
);

create policy "Admins can update parent win posts"
on public.parent_win_posts
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.id = auth.uid()
  )
);

create policy "Users can react to parent wins"
on public.parent_win_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view reactions"
on public.parent_win_reactions
for select
to authenticated
using (true);

create policy "Users can delete their own reactions"
on public.parent_win_reactions
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can report parent wins"
on public.parent_win_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can view parent win reports"
on public.parent_win_reports
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.id = auth.uid()
  )
);

create policy "Users can hide parent wins"
on public.parent_win_hidden_posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their hidden parent wins"
on public.parent_win_hidden_posts
for select
to authenticated
using (auth.uid() = user_id);

create index if not exists parent_win_posts_status_expires_idx
on public.parent_win_posts(status, expires_at);

create index if not exists parent_win_posts_created_idx
on public.parent_win_posts(created_at desc);

create index if not exists parent_win_reactions_post_idx
on public.parent_win_reactions(post_id);

create index if not exists parent_win_reports_post_idx
on public.parent_win_reports(post_id);

create index if not exists parent_win_hidden_user_idx
on public.parent_win_hidden_posts(user_id);