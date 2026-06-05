-- Contributors, admin role, storage bucket metadata

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

create table if not exists public.contributors (
  id uuid primary key references public.profiles (id) on delete cascade,
  contributions int not null default 0,
  accuracy numeric(5, 2) not null default 0,
  verified boolean not null default false,
  institution text not null default '',
  tier text not null default 'New'
    check (tier in ('Diamond', 'Gold', 'Silver', 'Bronze', 'New')),
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.contributors (id) on delete cascade,
  submission_id uuid references public.question_submissions (id) on delete set null,
  title text not null default '',
  created_at timestamptz not null default now()
);

alter table public.contributors enable row level security;
alter table public.contributions enable row level security;

create policy "contributors_select_public" on public.contributors for select using (true);
create policy "contributions_select_public" on public.contributions for select using (true);
create policy "contributors_upsert_own" on public.contributors for insert with check (auth.uid() = id);
create policy "contributors_update_own" on public.contributors for update using (auth.uid() = id);

-- Storage bucket (create in Supabase dashboard if not exists): question-uploads
