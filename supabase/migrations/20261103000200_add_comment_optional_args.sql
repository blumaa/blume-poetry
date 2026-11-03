-- Generated types mark a function argument optional only when it has a
-- default, and never nullable. Top-level comments have no parent and most
-- comments no email, so both default to null and callers leave them out.
-- Callers name their arguments, so the new order changes no call.
drop function add_comment(uuid, uuid, text, text, text, text);

create function add_comment(
  p_poem_id uuid,
  p_visitor_id text,
  p_author_name text,
  p_content text,
  p_parent_id uuid default null,
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
revoke execute on function add_comment(uuid, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function add_comment(uuid, text, text, text, uuid, text) to service_role;
