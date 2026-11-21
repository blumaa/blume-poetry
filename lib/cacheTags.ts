/* Next Data Cache tags on the public reads (lib/supabase/anon), declared once.
   An admin write expires its scope through /api/admin/revalidate. Comments
   expire themselves: the routes that write them expire the tag. */
export const CACHE_TAGS = {
  poems: 'poems',
  publications: 'publications',
  comments: 'comments',
} as const;

/* Time-based fallback for the tagged reads and the public pages' ISR. Tags do
   the real refreshing; this only catches edits made outside the app (direct
   SQL). Kept long: every expiry re-renders each crawled page, which costs
   Vercel Active CPU. Page segment configs must repeat it as a literal. */
export const CACHE_REVALIDATE_SECONDS = 86400;

export type CacheScope = keyof typeof CACHE_TAGS;

export const CACHE_SCOPES = Object.keys(CACHE_TAGS) as [CacheScope, ...CacheScope[]];
