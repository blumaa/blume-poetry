-- Admin access comes from the `role` claim in app_metadata, not a hardcoded
-- email. Only the service role can write app_metadata, so users cannot grant
-- it to themselves. Grant it once per admin (see README, "Admin access").
--
-- `(select auth.jwt())` runs once per statement instead of once per row.

create or replace function is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

drop policy if exists "Admin can read all poems" on poems;
drop policy if exists "Admin can insert poems" on poems;
drop policy if exists "Admin can update poems" on poems;
drop policy if exists "Admin can delete poems" on poems;
drop policy if exists "Admin can read subscribers" on subscribers;
drop policy if exists "Admin can update subscribers" on subscribers;
drop policy if exists "Admin can delete subscribers" on subscribers;
drop policy if exists "Admin can access email logs" on email_logs;
-- Signups go through /api/subscribe (validation, rate limit) with the service
-- role. This let the public key insert any row directly.
drop policy if exists "Public can subscribe" on subscribers;

create policy "Admin can read all poems" on poems
  for select to authenticated using ((select is_admin()));
create policy "Admin can insert poems" on poems
  for insert to authenticated with check ((select is_admin()));
create policy "Admin can update poems" on poems
  for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admin can delete poems" on poems
  for delete to authenticated using ((select is_admin()));

create policy "Admin can read subscribers" on subscribers
  for select to authenticated using ((select is_admin()));
create policy "Admin can update subscribers" on subscribers
  for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admin can delete subscribers" on subscribers
  for delete to authenticated using ((select is_admin()));

create policy "Admin can access email logs" on email_logs
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));
