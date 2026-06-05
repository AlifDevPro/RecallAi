-- Mock exam persistence

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Mock Exam',
  topics text[] not null default '{}',
  duration_min int not null default 60,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'graded')),
  score numeric(8, 2),
  max_score numeric(8, 2),
  config jsonb not null default '{}',
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.mock_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts (id) on delete cascade,
  sort_order int not null default 0,
  body text not null,
  marks int not null default 5,
  topic text not null default '',
  section text not null default 'Short',
  choices jsonb
);

create table if not exists public.mock_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.mock_questions (id) on delete cascade,
  attempt_id uuid not null references public.mock_attempts (id) on delete cascade,
  answer_text text,
  answer_image_path text,
  score numeric(8, 2),
  feedback text,
  graded_at timestamptz,
  unique (question_id)
);

create index if not exists mock_attempts_user on public.mock_attempts (user_id, started_at desc);

alter table public.mock_attempts enable row level security;
alter table public.mock_questions enable row level security;
alter table public.mock_answers enable row level security;

create policy "mock_attempts_all_own" on public.mock_attempts
  for all using (auth.uid() = user_id);

create policy "mock_questions_via_attempt" on public.mock_questions
  for all using (
    exists (
      select 1 from public.mock_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

create policy "mock_answers_via_attempt" on public.mock_answers
  for all using (
    exists (
      select 1 from public.mock_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );
