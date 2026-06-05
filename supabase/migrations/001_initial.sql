-- Recall Platform initial schema

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Study plan from onboarding
create table public.study_plans (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  goal text not null default '',
  goal_template text not null default '',
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  minutes_per_day int not null default 20,
  study_days smallint[] not null default '{}',
  deadline date,
  created_at timestamptz not null default now()
);

-- Topics
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Flashcards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  front text not null default '',
  back text not null default '',
  created_at timestamptz not null default now()
);

-- SRS scheduling per card
create table public.card_scheduling (
  card_id uuid primary key references public.cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  due_at timestamptz not null default now(),
  mastery numeric(5, 2) not null default 0 check (mastery >= 0 and mastery <= 100),
  mastery_7d_ago numeric(5, 2),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Review activity for streak / heatmap
create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  cards_reviewed int not null default 1 check (cards_reviewed > 0)
);

-- Rule-based insights
create table public.user_insights (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  body text not null default '',
  generated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.study_plans enable row level security;
alter table public.topics enable row level security;
alter table public.cards enable row level security;
alter table public.card_scheduling enable row level security;
alter table public.review_events enable row level security;
alter table public.user_insights enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "study_plans_all_own" on public.study_plans for all using (auth.uid() = user_id);

create policy "topics_all_own" on public.topics for all using (auth.uid() = user_id);

create policy "cards_all_own" on public.cards for all using (auth.uid() = user_id);

create policy "card_scheduling_all_own" on public.card_scheduling for all using (auth.uid() = user_id);

create policy "review_events_all_own" on public.review_events for all using (auth.uid() = user_id);

create policy "user_insights_all_own" on public.user_insights for all using (auth.uid() = user_id);

-- Indexes
create index topics_user_id_idx on public.topics (user_id);
create index cards_topic_id_idx on public.cards (topic_id);
create index cards_user_id_idx on public.cards (user_id);
create index card_scheduling_user_due_idx on public.card_scheduling (user_id, due_at);
create index review_events_user_reviewed_idx on public.review_events (user_id, reviewed_at desc);
