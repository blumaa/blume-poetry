/* Next Data Cache tags on the public reads (lib/supabase/anon), declared once.
   An admin write expires its scope through /api/admin/revalidate. Comments
   expire themselves: the routes that write them expire the tag. */
export const CACHE_TAGS = {
  poems: 'poems',
  publications: 'publications',
  comments: 'comments',
} as const;

export type CacheScope = keyof typeof CACHE_TAGS;

export const CACHE_SCOPES = Object.keys(CACHE_TAGS) as [CacheScope, ...CacheScope[]];
