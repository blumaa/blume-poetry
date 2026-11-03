-- Threaded comments: a comment may answer another on the same poem.
-- The composite key makes the database refuse a reply that points at a
-- comment on a different poem.
alter table comments add column parent_id uuid;
alter table comments add constraint comments_id_poem_id_key unique (id, poem_id);
alter table comments add constraint comments_parent_fkey
  foreign key (parent_id, poem_id) references comments (id, poem_id) on delete cascade;
create index idx_comments_parent_id on comments (parent_id) where parent_id is not null;

-- Removal keeps the row so replies keep their place under a tombstone.
-- Comments are publicly readable, so a removed row must hold no name or words.
alter table comments add column removed_at timestamptz;
alter table comments add constraint comments_removed_is_scrubbed
  check (removed_at is null or (author_name = '' and content = ''));
