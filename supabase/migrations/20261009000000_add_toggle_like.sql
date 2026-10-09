-- Toggle a visitor's like in one round trip and return the new state.
-- Replaces the API's select-then-insert/delete-then-count sequence: one call,
-- atomic, and no race between the lookup and the write.

create or replace function toggle_like(p_poem_id uuid, p_visitor_id text)
returns table (liked boolean, like_count bigint)
language plpgsql
set search_path = ''
as $$
begin
  delete from public.likes where poem_id = p_poem_id and visitor_id = p_visitor_id;
  if found then
    liked := false;
  else
    -- A concurrent like for the same visitor already holds the row: still liked.
    insert into public.likes (poem_id, visitor_id) values (p_poem_id, p_visitor_id)
      on conflict (poem_id, visitor_id) do nothing;
    liked := true;
  end if;
  select count(*) into like_count from public.likes where poem_id = p_poem_id;
  return next;
end;
$$;

-- Writes go through the API's service-role client only, as with the table.
revoke execute on function toggle_like(uuid, text) from public, anon, authenticated;
grant execute on function toggle_like(uuid, text) to service_role;
