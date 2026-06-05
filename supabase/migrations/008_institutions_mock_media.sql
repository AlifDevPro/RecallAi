create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text not null default ''
);

alter table public.mock_answers
  add column if not exists answer_audio_url text,
  add column if not exists answer_image_url text;

alter table public.institutions enable row level security;
create policy "institutions_select_public" on public.institutions for select using (true);

insert into public.institutions (name, country) values
  ('IIT Bombay', 'India'),
  ('IIT Delhi', 'India'),
  ('IIT Madras', 'India'),
  ('NIT Trichy', 'India'),
  ('BITS Pilani', 'India'),
  ('DU NCWEB', 'India'),
  ('Anna University', 'India')
on conflict (name) do nothing;
