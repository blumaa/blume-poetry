-- Subscribe in one atomic statement: insert a new address, reactivate an
-- unsubscribed one, or leave an active one alone. Replaces the API's
-- select-then-update-or-insert sequence, where two signups for the same
-- address could both miss the lookup and one would fail on the unique key.

create or replace function upsert_subscriber(p_email text, p_notify_new_poems boolean)
returns table (outcome text, subscriber public.subscribers)
language plpgsql
set search_path = ''
as $$
declare
  v_result record;
begin
  insert into public.subscribers as s (email, status, verified, notify_new_poems)
  values (lower(trim(p_email)), 'active', true, p_notify_new_poems)
  on conflict (email) do update set
    status = 'active',
    verified = true,
    subscribed_at = now(),
    notify_new_poems = excluded.notify_new_poems
  where s.status <> 'active'
  -- xmax is 0 on a freshly inserted row and non-zero on an updated one.
  returning (s.xmax = 0) as inserted, s as sub into v_result;

  if not found then
    outcome := 'already_active';
    subscriber := null;
  elsif v_result.inserted then
    outcome := 'inserted';
    subscriber := v_result.sub;
  else
    outcome := 'reactivated';
    subscriber := v_result.sub;
  end if;
  return next;
end;
$$;

revoke execute on function upsert_subscriber(text, boolean) from public, anon, authenticated;
grant execute on function upsert_subscriber(text, boolean) to service_role;
