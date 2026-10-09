# Blumenous Poetry

Next.js 16 site for poems, with an admin area, email subscribers and like
notifications. Data and auth live in Supabase. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together.

## Getting started

```bash
cp .env.example .env.local   # fill in the values
bun install
bun dev
```

Open http://localhost:3000.

## Scripts

- `bun run verify`: lint, typecheck, tests, gates and build. Run before a PR.
- `bun run db:types`: regenerate `lib/supabase/database.types.ts` from the
  linked project. Run after every migration.
- `supabase db push`: apply new files in `supabase/migrations/` to the linked
  project.

## Admin access

Admin rights come from the `role` claim in a user's `app_metadata`, which only
the service role can write. To make someone an admin, run this once in the
Supabase SQL editor:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'admin@example.com';
```

The claim is read from the session token, so the user must sign out and back
in before it takes effect.
