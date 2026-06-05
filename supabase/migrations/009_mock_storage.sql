-- Mock uploads bucket + answer metadata columns

insert into storage.buckets (id, name, public)
values ('mock-uploads', 'mock-uploads', true)
on conflict (id) do nothing;

create policy "mock_uploads_select_own"
  on storage.objects for select
  using (bucket_id = 'mock-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "mock_uploads_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'mock-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "mock_uploads_update_own"
  on storage.objects for update
  using (bucket_id = 'mock-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "mock_uploads_delete_own"
  on storage.objects for delete
  using (bucket_id = 'mock-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

alter table public.mock_answers
  add column if not exists answer_modality text
    check (answer_modality is null or answer_modality in ('text', 'voice', 'image'));

alter table public.mock_questions
  add column if not exists correct_index int;
