import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const POEMS_CACHE_TAG = 'poems';

let anon: SupabaseClient<Database> | undefined;
/** Shared anon client for request-fresh reads/writes (likes, comments). No caching. */
export function getAnonClient(): SupabaseClient<Database> {
  if (!anon) anon = createClient<Database>(url(), key());
  return anon;
}

// Reads through Next's Data Cache, tagged POEMS_CACHE_TAG: identical poem and
// tree queries are fetched once and shared across statically generated pages.
// revalidateTag('poems') busts them on poem edits.
const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, next: { revalidate: 3600, tags: [POEMS_CACHE_TAG] } });

let cachedPoem: SupabaseClient<Database> | undefined;
/** Cached anon client: RLS limits it to published main poems. */
export function getCachedPoemClient(): SupabaseClient<Database> {
  if (!cachedPoem) {
    cachedPoem = createClient<Database>(url(), key(), { global: { fetch: cachedFetch } });
  }
  return cachedPoem;
}

let cachedService: SupabaseClient<Database> | undefined;
/**
 * Cached service-role client: bypasses RLS. Server only, for the poems the
 * anon key must not read (the kinky collection). Every query on it filters
 * status and collection itself.
 */
export function getCachedServiceClient(): SupabaseClient<Database> {
  if (!cachedService) {
    cachedService = createClient<Database>(url(), process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
      auth: { persistSession: false },
      global: { fetch: cachedFetch },
    });
  }
  return cachedService;
}
