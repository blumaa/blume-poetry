# Architecture

Rules the code follows. Gates enforce most of them: `bun run verify` runs lint, typecheck, tests, gates, build.

## Layout

- `app/` — routes only. Pages compose features; no data calls of their own beyond feature exports.
- `features/<name>/` — one domain each: auth, comments, dashboard, likes, notifications, poems, push, subscribers.
  - `index.ts` — the barrel. Only way in from outside the feature.
  - `api/` — the feature's data calls (Supabase client or `apiFetch`). Components never query directly.
- `components/` — shared UI with no domain of its own (shell, sidebar, poem rendering).
  - `components/mds` — `'use client'` barrel over `@mond-design-system/react`. Import MDS from here.
  - `components/icons` — the one icon registry.
- `layouts/` — shared page shells.
- `lib/` — framework-free helpers and server modules (`poems.ts`, `email.ts`, `supabase/*`).

## Data

- Every query key lives in `lib/queryKeys.ts`. No inline key arrays.
- Client fetches to `/api/*` go through `lib/apiFetch`. It throws `ApiError` with the route's `{ error }` message; show that message.
- Supabase queries use `.throwOnError()`. Errors propagate; nothing returns `[]` or `null` on failure.
- No optimistic updates. Mutations disable via `isPending` (MDS `Button loading`), then invalidate. Never `onMutate`.
- Admin writes invalidate `queryKeys.admin.all()`: admin views overlap, so all go stale together.
- Each stateful widget mounts once. Responsive variants (desktop popover, mobile sheet) share one instance or one query, never two copies of state.

## UI

- A button that navigates: `ButtonLink` from `components/mds`. Never `Button as={Link}`: in a server component `Link` is a plain function and cannot cross into the client `Button` (build fails at prerender).
- MDS owns buttons, form controls, dialogs, hidden text (`VisuallyHidden`) and touch targets. No hand-rolled button CSS, no touch-target CSS.
- Icons: `<Icon name=… />` from `components/icons`. Glyphs live in `glyphs.tsx`. Size via `size` (sm/md/lg) or `--mds-icon-slot` on the wrapper. Exceptions: `BrandLogo`, `app/icon.svg`.
- CSS Modules only, one per component. No utility classes.

## Tokens

- Palette source: `app/tokens/brand-blume.css` (`--mds-*`, light and dark). Use these for text, surfaces, borders, accent, status, scrim, elevation.
  - Accent as text: `--mds-text-accent`. Accent as fill: `--mds-accent` with `--mds-accent-contrast`.
- `app/globals.css` declares only app-only tokens: logo, sidebar background, hover fill, info, heart, sizes, poem measure.
- No literal colours outside those two files.

## Gates

| Gate | Where | Rule |
|---|---|---|
| storage | eslint `no-restricted-globals/properties` | `localStorage`/`sessionStorage` only in `lib/browserStorage.ts` |
| data | eslint `no-restricted-imports` | `@/lib/supabase/client` only in `features/*/api/**` and `lib/supabase/**` |
| feature | eslint `no-restricted-imports` | import a feature from its barrel, never `@/features/x/deep` |
| size | eslint `max-lines` | `.tsx` at most 300 lines |
| link | eslint `no-restricted-syntax` | no `Button as=…`; use `ButtonLink` |
| token | `scripts/tokenGate.mjs` | no raw colours in stylesheets |

Each gate has a watched-to-fail test in `scripts/gates.test.mjs` (`bun run test:gates`).
