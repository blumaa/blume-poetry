-- Columns that always hold a value become NOT NULL, and status columns become
-- enums, so the generated types say what the data really is (no `| null` on
-- timestamps that default to now(), no plain `string` for a fixed set).

create type poem_status as enum ('draft', 'published');
create type subscriber_status as enum ('active', 'unsubscribed');
-- 'sending' marks a send in progress: the row is written before the first
-- email goes out and updated when the last one finishes.
create type email_log_status as enum ('sending', 'sent', 'partial', 'failed');

-- A column used in a policy can't change type while the policy exists.
drop policy "Public can read published poems" on poems;

alter table poems drop constraint poems_status_check;
alter table poems alter column status drop default;
alter table poems alter column status type poem_status using status::poem_status;
alter table poems alter column status set default 'published';
alter table poems
  alter column status set not null,
  alter column published_at set not null,
  alter column updated_at set not null;

create policy "Public can read published poems" on poems
  for select using (status = 'published');

alter table subscribers drop constraint subscribers_status_check;
alter table subscribers alter column status drop default;
alter table subscribers alter column status type subscriber_status using status::subscriber_status;
alter table subscribers alter column status set default 'active';
alter table subscribers
  alter column status set not null,
  alter column subscribed_at set not null;

-- Always true: there is no verification flow behind it.
alter table subscribers drop column verified;

create or replace function upsert_subscriber(p_email text, p_notify_new_poems boolean)
returns table (outcome text, subscriber public.subscribers)
language plpgsql
set search_path = ''
as $$
declare
  v_result record;
begin
  insert into public.subscribers as s (email, status, notify_new_poems)
  values (lower(trim(p_email)), 'active', p_notify_new_poems)
  on conflict (email) do update set
    status = 'active',
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

alter table email_logs alter column status drop default;
alter table email_logs alter column status type email_log_status using status::email_log_status;
alter table email_logs alter column status set default 'sending';
alter table email_logs
  alter column status set not null,
  alter column sent_at set not null,
  alter column recipient_count set not null,
  alter column recipient_count set default 0;

alter table likes alter column created_at set not null;
alter table comments alter column created_at set not null;
