-- Fixed-window rate limit counters shared by every server instance. The old
-- in-memory Map lived per serverless instance and reset on each cold start.

create table rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- Service role only: RLS on, no policies.
alter table rate_limits enable row level security;

-- Counts one request against `p_key` and answers whether it is within
-- `p_limit` for the current window. One atomic upsert, so concurrent requests
-- can't both read a stale count.
create or replace function check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then excluded.reset_at else r.reset_at end
  returning r.count into v_count;

  -- Expired windows are dead rows. Sweep them on about 1 call in 100 rather
  -- than running a scheduled job.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now();
  end if;

  return v_count <= p_limit;
end;
$$;

revoke execute on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function check_rate_limit(text, integer, integer) to service_role;
