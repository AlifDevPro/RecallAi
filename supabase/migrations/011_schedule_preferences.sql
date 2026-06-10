-- Schedule preferences: hours-based study budget + plain-language narrative for AI planner
alter table public.study_plans
  add column if not exists hours_per_day numeric(4,1) not null default 0.5,
  add column if not exists schedule_narrative text not null default '';

update public.study_plans
set hours_per_day = round(minutes_per_day / 60.0, 1)
where hours_per_day = 0.5 and minutes_per_day <> 30;
