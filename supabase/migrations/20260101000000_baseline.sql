-- Baseline: the production schema as it stood on 2026-10-09, read from the
-- live catalog. It replaces the hand-run scripts (schema.sql,
-- add-likes-comments.sql, add-email-analytics.sql,
-- harden-likes-comments-rls.sql) and the first three migrations, none of which
-- were recorded in the migration history. Production is marked as having
-- applied it (`supabase migration repair --status applied 20260101000000`); a fresh
-- database gets the same schema from it. Later migrations change it.

create table poems (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null,
  plain_text text,
  published_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text default 'published' check (status in ('draft', 'published')),
  url text,
  subtitle text,
  pinned boolean not null default false,
  -- Set when the publish notification for this poem has been sent. Claimed
  -- with a conditional UPDATE so a retry can't send the list twice.
  notified_at timestamptz
);

create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz default now(),
  status text default 'active' check (status in ('active', 'unsubscribed')),
  verified boolean default false,
  -- `status` is the master switch; this only governs new-poem notifications.
  notify_new_poems boolean not null default true
);

create table email_logs (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz default now(),
  subject text not null,
  poem_id uuid references poems(id) on delete set null,
  recipient_count integer,
  status text default 'sent',
  resend_email_id text,
  open_count integer default 0,
  click_count integer default 0,
  unique_opens integer default 0,
  unique_clicks integer default 0
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  email_log_id uuid references email_logs(id) on delete cascade,
  resend_email_id text,
  event_type text not null check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  recipient_email text,
  link_url text,
  user_agent text,
  ip_address text,
  created_at timestamptz default now()
);

create table likes (
  id uuid primary key default gen_random_uuid(),
  poem_id uuid not null references poems(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz default now(),
  unique (poem_id, visitor_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  poem_id uuid not null references poems(id) on delete cascade,
  visitor_id text not null,
  author_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- The admin's devices. Read and written only by the service-role client.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index idx_poems_slug on poems (slug);
create index idx_poems_published_at on poems (published_at desc);
create index idx_poems_status on poems (status);
create index idx_poems_pinned on poems (pinned) where pinned = true;
create index idx_subscribers_email on subscribers (email);
create index idx_subscribers_status on subscribers (status);
create index idx_subscribers_notify_new_poems on subscribers (status) where notify_new_poems;
create index idx_email_logs_resend_email_id on email_logs (resend_email_id);
create index idx_email_events_email_log_id on email_events (email_log_id);
create index idx_email_events_resend_email_id on email_events (resend_email_id);
create index idx_email_events_event_type on email_events (event_type);
create index idx_email_events_created_at on email_events (created_at desc);
create index idx_likes_poem_id on likes (poem_id);
create index idx_likes_visitor_id on likes (visitor_id);
create index idx_comments_poem_id on comments (poem_id);
create index idx_comments_created_at on comments (created_at desc);

alter table poems enable row level security;
alter table subscribers enable row level security;
alter table email_logs enable row level security;
alter table email_events enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table push_subscriptions enable row level security;

create policy "Public can read published poems" on poems
  for select using (status = 'published');
create policy "Admin can read all poems" on poems
  for select using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');
create policy "Admin can insert poems" on poems
  for insert with check (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');
create policy "Admin can update poems" on poems
  for update using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');
create policy "Admin can delete poems" on poems
  for delete using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

create policy "Public can subscribe" on subscribers
  for insert with check (true);
create policy "Admin can read subscribers" on subscribers
  for select using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');
create policy "Admin can update subscribers" on subscribers
  for update using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');
create policy "Admin can delete subscribers" on subscribers
  for delete using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

create policy "Admin can access email logs" on email_logs
  for all using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

create policy "Admin can read email events" on email_events
  for select using (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');
create policy "Service role can insert email events" on email_events
  for insert with check (true);

-- Likes and comments are written only by the API's service-role client.
create policy "Public can read likes" on likes
  for select using (true);
create policy "Public can read comments" on comments
  for select using (true);

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_poems_updated_at
  before update on poems
  for each row
  execute function update_updated_at_column();

create or replace function increment_email_stat(log_id uuid, stat_column text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('UPDATE email_logs SET %I = COALESCE(%I, 0) + 1 WHERE id = $1', stat_column, stat_column)
  using log_id;
end;
$$;
