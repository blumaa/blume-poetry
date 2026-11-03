-- A commenter may leave an email to hear when someone replies. Comments are
-- publicly readable, so the address lives in its own table: RLS on, no
-- policies, only the service role reads or writes it.
create table comment_emails (
  comment_id uuid primary key references comments on delete cascade,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

alter table comment_emails enable row level security;

-- Unsubscribe clears every address match.
create index idx_comment_emails_email on comment_emails (email);

-- A removed comment is scrubbed of its words; its author's address goes with
-- them, in the same transaction, whichever path removes it.
create function forget_removed_comment_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.comment_emails where comment_id = new.id;
  return new;
end;
$$;

create trigger comments_forget_email_on_remove
  after update of removed_at on comments
  for each row
  when (old.removed_at is null and new.removed_at is not null)
  execute function forget_removed_comment_email();

-- A comment and its email land together or not at all, so a failed email
-- write never leaves a saved comment behind a 500 the visitor would retry.
create function add_comment(
  p_poem_id uuid,
  p_parent_id uuid,
  p_visitor_id text,
  p_author_name text,
  p_content text,
  p_email text default null
)
returns public.comments
language plpgsql
set search_path = ''
as $$
declare
  saved public.comments;
begin
  insert into public.comments (poem_id, parent_id, visitor_id, author_name, content)
  values (p_poem_id, p_parent_id, p_visitor_id, p_author_name, p_content)
  returning * into saved;

  if p_email is not null then
    insert into public.comment_emails (comment_id, email) values (saved.id, p_email);
  end if;

  return saved;
end;
$$;

-- Writes go through the API's service-role client only, as with the table.
revoke execute on function add_comment(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function add_comment(uuid, uuid, text, text, text, text) to service_role;
