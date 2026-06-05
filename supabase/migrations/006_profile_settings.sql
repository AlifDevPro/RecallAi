alter table public.profiles
  add column if not exists bio text default '',
  add column if not exists avatar_url text,
  add column if not exists settings jsonb not null default '{}',
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'team'));
