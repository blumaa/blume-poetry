-- Browser push subscriptions for the admin's devices.
-- Written and read only through API routes using the service-role key, so RLS
-- is enabled with no policies: the anon key can neither read nor write rows.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
