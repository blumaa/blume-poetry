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

let cachedPoem: SupabaseClient<Database> | undefined;
/**
 * Anon client whose reads flow through Next's Data Cache, tagged POEMS_CACHE_TAG.
 * Identical poem/tree queries are fetched once and shared across all statically
 * generated pages; revalidateTag('poems') busts them on poem edits.
 */
export function getCachedPoemClient(): SupabaseClient<Database> {
  if (!cachedPoem) {
    cachedPoem = createClient<Database>(url(), key(), {
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: { revalidate: 3600, tags: [POEMS_CACHE_TAG] },
          }),
      },
    });
  }
  return cachedPoem;
}
