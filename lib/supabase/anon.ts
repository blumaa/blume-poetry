import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CACHE_TAGS } from '../cacheTags';
import type { Database } from './types';

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let anon: SupabaseClient<Database> | undefined;
/** Shared anon client for request-fresh reads/writes (likes, comments). No caching. */
export function getAnonClient(): SupabaseClient<Database> {
  if (!anon) anon = createClient<Database>(url(), key());
  return anon;
}

// Reads through Next's Data Cache, tagged: identical queries are fetched once
// and shared across statically generated pages. revalidateTag busts a tag on
// admin writes (/api/admin/revalidate).
const taggedFetch =
  (tags: string[]): typeof fetch =>
  (input, init) =>
    fetch(input, { ...init, next: { revalidate: 3600, tags } });

const cachedFetch = taggedFetch([CACHE_TAGS.poems]);

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

let cachedPublication: SupabaseClient<Database> | undefined;
/**
 * Cached anon client for the publications page. Tagged poems too: the page
 * links each credit's poem, so a poem edit (a new slug, unpublishing) must
 * reach it.
 */
export function getCachedPublicationClient(): SupabaseClient<Database> {
  if (!cachedPublication) {
    cachedPublication = createClient<Database>(url(), key(), {
      global: { fetch: taggedFetch([CACHE_TAGS.publications, CACHE_TAGS.poems]) },
    });
  }
  return cachedPublication;
}
