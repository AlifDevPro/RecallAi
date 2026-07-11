-- Ensure mock MCQ grading column exists (may have been skipped if 009 was not applied).
alter table public.mock_questions
  add column if not exists correct_index int;

-- Allow anyone to read scan images linked to public question-bank papers.
drop policy if exists "question_uploads_select_public_papers" on storage.objects;

create policy "question_uploads_select_public_papers"
  on storage.objects for select
  using (
    bucket_id = 'question-uploads'
    and exists (
      select 1
      from public.papers p,
      lateral jsonb_array_elements(coalesce(p.scans, '[]'::jsonb)) as scan_elem
      where p.visibility = 'public'
        and p.has_photo = true
        and scan_elem->>'pageUrl' = name
    )
  );
