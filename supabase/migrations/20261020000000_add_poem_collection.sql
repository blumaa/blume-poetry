-- Poems belong to a collection. 'main' is the public site. 'kinky' lives at
-- /kinky, reachable only by its URL: the anon key must never read it, since
-- that key ships in the browser bundle. The server reads kinky poems with the
-- service role.

create type poem_collection as enum ('main', 'kinky');

alter table poems add column collection poem_collection not null default 'main';

drop policy "Public can read published poems" on poems;
create policy "Public can read published poems" on poems
  for select using (status = 'published' and collection = 'main');

-- Search takes the collection. Still security invoker: under the anon key RLS
-- returns no kinky rows whatever the argument. The default keeps the deployed
-- one-argument call working between this migration and the code that passes it.
drop function search_poems(text);

create function search_poems(p_query text, p_collection poem_collection default 'main')
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
    and p.collection = p_collection
    and (p.title ilike pattern.value or p.plain_text ilike pattern.value)
  order by p.published_at desc
  limit 50;
$$;
