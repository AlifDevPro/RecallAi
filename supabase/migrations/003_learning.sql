-- Learning loop: schedule blocks and topic roadmaps

alter table public.topics
  add column if not exists roadmap jsonb not null default '[]';

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day smallint not null check (day >= 0 and day <= 6),
  start_time text not null,
  end_time text not null,
  title text not null,
  kind text not null default 'review',
  detail text not null default '',
  done boolean not null default false,
  ai_generated boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists schedule_blocks_user_day on public.schedule_blocks (user_id, day);

alter table public.schedule_blocks enable row level security;

create policy "schedule_blocks_all_own" on public.schedule_blocks
  for all using (auth.uid() = user_id);
