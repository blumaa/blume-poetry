-- The admin's notification marks: everything at or before `last_seen_at` is
-- read, everything at or before `cleared_at` is hidden. They lived in
-- localStorage, which is per browser and per origin and which Safari wipes
-- after 7 days without a visit, so cleared notifications came back. One row
-- per admin, shared by every device.

create table admin_inbox (
  user_id uuid primary key references auth.users on delete cascade,
  last_seen_at timestamptz,
  cleared_at timestamptz
);

alter table admin_inbox enable row level security;

create policy "Admin reads own inbox" on admin_inbox
  for select to authenticated
  using ((select is_admin()) and user_id = (select auth.uid()));

-- Writes go through advance_inbox_marks only, so a mark never moves back.
-- A device with an older list would otherwise un-clear what another cleared.
-- Null leaves a mark as it is (greatest ignores nulls).
create function advance_inbox_marks(p_last_seen timestamptz, p_cleared timestamptz default null)
returns public.admin_inbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  marks public.admin_inbox;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  insert into public.admin_inbox (user_id, last_seen_at, cleared_at)
  values (auth.uid(), p_last_seen, p_cleared)
  on conflict (user_id) do update set
    last_seen_at = greatest(admin_inbox.last_seen_at, excluded.last_seen_at),
    cleared_at = greatest(admin_inbox.cleared_at, excluded.cleared_at)
  returning * into marks;

  return marks;
end;
$$;

revoke execute on function advance_inbox_marks(timestamptz, timestamptz) from public, anon;
grant execute on function advance_inbox_marks(timestamptz, timestamptz) to authenticated;
