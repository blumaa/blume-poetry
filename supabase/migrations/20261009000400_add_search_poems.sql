-- Search in the database instead of loading every poem body into the server
-- and filtering in JavaScript. Trigram indexes serve ILIKE '%term%'.

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_poems_title_trgm
  on poems using gin (title extensions.gin_trgm_ops);
create index if not exists idx_poems_plain_text_trgm
  on poems using gin (plain_text extensions.gin_trgm_ops);

-- Security invoker: RLS still hides drafts from the anon key. The query is
-- matched literally: %, _ and \ are escaped.
create or replace function search_poems(p_query text)
returns table (id uuid, slug text, title text)
language sql
stable
set search_path = ''
as $$
  select p.id, p.slug, p.title
  from public.poems p,
    lateral (
      select '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' as value
    ) pattern
  where p.status = 'published'
    and (p.title ilike pattern.value or p.plain_text ilike pattern.value)
  order by p.published_at desc
  limit 50;
$$;
