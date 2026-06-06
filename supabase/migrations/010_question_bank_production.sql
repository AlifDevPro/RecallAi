-- Question bank production: papers metadata, guest submissions, storage

alter table public.papers
  add column if not exists submission_id uuid references public.question_submissions (id) on delete set null,
  add column if not exists uploader_id uuid references public.profiles (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists papers_university_idx on public.papers (university);
create index if not exists papers_course_idx on public.papers (course);
create index if not exists papers_department_idx on public.papers (department);
create index if not exists papers_year_idx on public.papers (year desc);
create index if not exists papers_exam_type_idx on public.papers (exam_type);
create index if not exists papers_verified_idx on public.papers (verified);
create index if not exists papers_visibility_year_idx on public.papers (visibility, year desc);

-- Guest + authenticated submission inserts
drop policy if exists "question_submissions_all_own" on public.question_submissions;
create policy "question_submissions_select_own" on public.question_submissions
  for select using (auth.uid() = user_id or user_id is null);
create policy "question_submissions_insert" on public.question_submissions
  for insert with check (user_id is null or auth.uid() = user_id);
create policy "question_submissions_update_own" on public.question_submissions
  for update using (auth.uid() = user_id);

-- Allow inserts into submitted_questions for own or guest submissions
drop policy if exists "submitted_questions_via_submission" on public.submitted_questions;
create policy "submitted_questions_select_via_submission" on public.submitted_questions
  for select using (
    exists (
      select 1 from public.question_submissions s
      where s.id = submission_id and (s.user_id = auth.uid() or s.user_id is null)
    )
  );
create policy "submitted_questions_insert_via_submission" on public.submitted_questions
  for insert with check (
    exists (
      select 1 from public.question_submissions s
      where s.id = submission_id and (s.user_id = auth.uid() or s.user_id is null)
    )
  );

-- Increment paper views atomically
create or replace function public.increment_paper_views(paper_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.papers set views = views + 1, updated_at = now() where id = paper_id;
end;
$$;

-- question-uploads storage bucket
insert into storage.buckets (id, name, public)
values ('question-uploads', 'question-uploads', false)
on conflict (id) do nothing;

create policy "question_uploads_select_own"
  on storage.objects for select
  using (
    bucket_id = 'question-uploads'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles p where p.role = 'admin' and p.id = auth.uid())
    )
  );

create policy "question_uploads_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'question-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "question_uploads_update_own"
  on storage.objects for update
  using (
    bucket_id = 'question-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "question_uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'question-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
