-- Cached AI insights per topic (generated via /api/ai/topics/[slug]/insights/regenerate)
alter table public.topics
  add column if not exists insights jsonb;
