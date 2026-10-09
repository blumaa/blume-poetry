-- Indexes that match the queries the app runs, minus ones a unique constraint
-- already provides.

-- Duplicates of unique-constraint indexes.
drop index if exists idx_poems_slug;            -- poems_slug_key
drop index if exists idx_subscribers_email;     -- subscribers_email_key
drop index if exists idx_likes_poem_id;         -- likes_poem_id_visitor_id_key leads with poem_id
-- No query filters likes by visitor alone.
drop index if exists idx_likes_visitor_id;

-- Published poems newest first: one index for the filter and the order.
drop index if exists idx_poems_status;
drop index if exists idx_poems_published_at;
create index if not exists idx_poems_status_published_at on poems (status, published_at desc);

-- A poem's comments newest first.
drop index if exists idx_comments_poem_id;
drop index if exists idx_comments_created_at;
create index if not exists idx_comments_poem_id_created_at on comments (poem_id, created_at desc);

-- Pin the search path so a caller's schema can't shadow now().
create or replace function update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
