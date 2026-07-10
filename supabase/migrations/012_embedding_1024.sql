-- Upgrade pgvector columns to 1024 dimensions (Bedrock / Titan embeddings).
-- After applying, set EMBEDDING_DIMENSIONS=1024 in your app environment.

drop index if exists public.content_chunks_embedding_idx;

alter table public.content_chunks
  alter column embedding type extensions.vector(1024)
  using (
    case
      when embedding is null then null
      else (embedding::text::extensions.vector(1024))
    end
  );

create index content_chunks_embedding_idx on public.content_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_content_chunks(
  query_embedding extensions.vector(1024),
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
