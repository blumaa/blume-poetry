-- Emoji reactions on comments, as kinbaku-study-group has them: a visitor may
-- leave many emoji on one comment, one row per emoji, from a fixed catalogue.
-- Rows of the catalogue land in 20261127000100.

create type emoji_category as enum (
  'smileys', 'people', 'nature', 'food', 'travel', 'activities', 'objects', 'symbols', 'flags'
);
comment on type emoji_category is 'Unicode''s emoji group, minus Component. One picker tab each.';

-- 🧑🏻‍❤️‍💋‍🧑🏼 is ten code points; sixteen leaves room for the next Unicode version.
create table emoji (
  char text primary key check (char <> '' and length(char) <= 16),
  name text not null,
  category emoji_category not null,
  sort_order integer not null unique,
  -- The picker's quick row, before the reader has recent ones.
  quick boolean not null default false,
  -- A skin-tone variant names its base, so the picker shows one cell per emoji.
  base text references emoji (char),
  tone smallint check (tone between 1 and 5),
  tags text[] not null default '{}',
  constraint emoji_tone_has_base check ((base is null) = (tone is null))
);
comment on table emoji is
  'The reaction catalogue: Unicode 15.1 fully-qualified emoji. Public read, written by migration only.';

alter table emoji enable row level security;
create policy emoji_read on emoji for select to anon, authenticated using (true);

create table comment_reactions (
  comment_id uuid not null references comments (id) on delete cascade,
  visitor_id text not null,
  emoji text not null references emoji (char),
  created_at timestamptz not null default now(),
  primary key (comment_id, visitor_id, emoji)
);

-- No policies: visitor ids stay private. Reads and writes go through the
-- functions below, called by the API's service-role client only.
alter table comment_reactions enable row level security;

-- [{emoji, count}] for one comment, biggest count first, then catalogue order.
create function comment_reaction_summary(p_comment_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('emoji', s.emoji, 'count', s.n) order by s.n desc, s.sort_order), '[]'::jsonb)
    from (
      select r.emoji, count(*) as n, min(e.sort_order) as sort_order
        from public.comment_reactions r
        join public.emoji e on e.char = r.emoji
       where r.comment_id = p_comment_id
       group by r.emoji
    ) s;
$$;

-- One visitor's emoji on one comment, in catalogue order.
create function comment_reactions_mine(p_comment_id uuid, p_visitor_id text)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(r.emoji order by e.sort_order), '{}')
    from public.comment_reactions r
    join public.emoji e on e.char = r.emoji
   where r.comment_id = p_comment_id
     and r.visitor_id = p_visitor_id;
$$;

-- Every live comment on a poem that has reactions. Removed comments show none.
create function poem_comment_reactions(p_poem_id uuid, p_visitor_id text)
returns table (comment_id uuid, reactions jsonb, mine text[])
language sql
stable
set search_path = ''
as $$
  select c.id,
         public.comment_reaction_summary(c.id),
         public.comment_reactions_mine(c.id, p_visitor_id)
    from public.comments c
   where c.poem_id = p_poem_id
     and c.removed_at is null
     and exists (select 1 from public.comment_reactions r where r.comment_id = c.id);
$$;

-- Adds the emoji if it is not this visitor's on this comment, removes it if it
-- is. One call, atomic. `added` says which, for the admin push.
create function toggle_comment_reaction(p_comment_id uuid, p_visitor_id text, p_emoji text)
returns table (added boolean, reactions jsonb, mine text[])
language plpgsql
set search_path = ''
as $$
begin
  delete from public.comment_reactions
   where comment_id = p_comment_id
     and visitor_id = p_visitor_id
     and emoji = p_emoji;

  if found then
    added := false;
  else
    -- A concurrent toggle already holds the row: still added.
    insert into public.comment_reactions (comment_id, visitor_id, emoji)
         values (p_comment_id, p_visitor_id, p_emoji)
    on conflict do nothing;
    added := true;
  end if;

  reactions := public.comment_reaction_summary(p_comment_id);
  mine := public.comment_reactions_mine(p_comment_id, p_visitor_id);
  return next;
end;
$$;

revoke execute on function comment_reaction_summary(uuid) from public, anon, authenticated;
revoke execute on function comment_reactions_mine(uuid, text) from public, anon, authenticated;
revoke execute on function poem_comment_reactions(uuid, text) from public, anon, authenticated;
revoke execute on function toggle_comment_reaction(uuid, text, text) from public, anon, authenticated;
grant execute on function poem_comment_reactions(uuid, text) to service_role;
grant execute on function toggle_comment_reaction(uuid, text, text) to service_role;
