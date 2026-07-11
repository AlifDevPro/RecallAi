-- SM-2 spaced repetition fields on card_scheduling
alter table public.card_scheduling
  add column if not exists easiness numeric(4, 2) not null default 2.5,
  add column if not exists interval_days numeric(8, 2) not null default 0,
  add column if not exists repetitions int not null default 0,
  add column if not exists lapse_count int not null default 0;

create index if not exists card_scheduling_user_due_idx
  on public.card_scheduling (user_id, due_at);

-- Backfill repetitions from existing mastery for migrated rows
update public.card_scheduling
set repetitions = case when mastery > 0 then greatest(1, least(5, floor(mastery / 20))) else 0 end
where repetitions = 0 and last_reviewed_at is not null;
