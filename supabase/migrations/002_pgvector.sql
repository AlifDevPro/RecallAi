-- pgvector + AI content tables
create extension if not exists vector with schema extensions;

-- AI usage tracking
create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null,
  model text not null,
  route text not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  latency_ms int not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_logs_created_idx on public.ai_usage_logs (created_at desc);
create index ai_usage_logs_user_idx on public.ai_usage_logs (user_id);

-- Vector documents
create table public.content_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  user_id uuid references public.profiles (id) on delete cascade,
  title text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id, user_id)
);

create table public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.content_documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(768),
  token_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index content_chunks_document_idx on public.content_chunks (document_id);
create index content_chunks_embedding_idx on public.content_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- Question bank (DB-backed)
create table public.papers (
  id text primary key,
  course text not null,
  course_title text not null default '',
  university text not null default '',
  department text not null default '',
  semester text not null default '',
  year int not null,
  exam_type text not null default 'Final',
  duration text not null default '',
  total_marks int not null default 0,
  uploader text not null default '',
  verified boolean not null default false,
  views int not null default 0,
  has_digital boolean not null default true,
  has_photo boolean not null default false,
  digital jsonb not null default '{"sections":[]}',
  scans jsonb not null default '[]',
  visibility text not null default 'public',
  created_at timestamptz not null default now()
);

create table public.question_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending',
  institution text not null default '',
  course text not null default '',
  semester text not null default '',
  year int,
  term text not null default '',
  topic text not null default '',
  file_paths jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.submitted_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.question_submissions (id) on delete cascade,
  raw_text text not null,
  cleaned_text text not null,
  marks int not null default 0,
  topic text not null default '',
  term text not null default '',
  year int,
  question_type text not null default 'Short',
  confidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Tutor persistence
create table public.tutor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_slug text,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.tutor_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Rate limiting (simple daily counter)
create table public.ai_rate_limits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  request_count int not null default 0,
  primary key (user_id, day)
);

-- RLS
alter table public.ai_usage_logs enable row level security;
alter table public.content_documents enable row level security;
alter table public.content_chunks enable row level security;
alter table public.papers enable row level security;
alter table public.question_submissions enable row level security;
alter table public.submitted_questions enable row level security;
alter table public.tutor_threads enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.ai_rate_limits enable row level security;

create policy "ai_usage_logs_insert_service" on public.ai_usage_logs for insert with check (true);
create policy "ai_usage_logs_select_own" on public.ai_usage_logs for select using (auth.uid() = user_id);

create policy "content_documents_all_own" on public.content_documents for all using (auth.uid() = user_id);
create policy "content_documents_select_public" on public.content_documents for select using (
  metadata->>'visibility' = 'public' or user_id is null
);

create policy "content_chunks_via_document" on public.content_chunks for select using (
  exists (
    select 1 from public.content_documents d
    where d.id = document_id
    and (d.user_id = auth.uid() or d.metadata->>'visibility' = 'public' or d.user_id is null)
  )
);

create policy "papers_select_public" on public.papers for select using (visibility = 'public');
create policy "papers_insert_auth" on public.papers for insert with check (true);

create policy "question_submissions_all_own" on public.question_submissions for all using (auth.uid() = user_id);
create policy "submitted_questions_via_submission" on public.submitted_questions for all using (
  exists (
    select 1 from public.question_submissions s
    where s.id = submission_id and (s.user_id = auth.uid() or s.user_id is null)
  )
);

create policy "tutor_threads_all_own" on public.tutor_threads for all using (auth.uid() = user_id);
create policy "tutor_messages_via_thread" on public.tutor_messages for all using (
  exists (
    select 1 from public.tutor_threads t
    where t.id = thread_id and t.user_id = auth.uid()
  )
);

create policy "ai_rate_limits_own" on public.ai_rate_limits for all using (auth.uid() = user_id);

-- Vector similarity search
create or replace function public.match_content_chunks(
  query_embedding extensions.vector(768),
  match_count int default 8,
  filter_user_id uuid default null,
  include_public boolean default true
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source_type text,
  source_id text,
  title text,
  similarity float
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    c.content,
    d.source_type,
    d.source_id,
    d.title,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.content_chunks c
  join public.content_documents d on d.id = c.document_id
  where c.embedding is not null
    and (
      (filter_user_id is not null and d.user_id = filter_user_id)
      or (include_public and (d.metadata->>'visibility' = 'public' or d.user_id is null))
    )
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_content_chunks to authenticated, anon;
