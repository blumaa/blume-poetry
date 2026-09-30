/* Every React Query key, declared once. Readers and invalidators import from
   here; an inline key array is a second declaration of the same fact. */
export const queryKeys = {
  admin: {
    activity: () => ['admin', 'activity'] as const,
    comments: () => ['admin', 'comments'] as const,
    /** No status: the prefix, which invalidates every filtered list. */
    poems: (status?: string | null) =>
      status === undefined ? (['admin', 'poems'] as const) : (['admin', 'poems', status] as const),
    poem: (id: string) => ['admin', 'poems', 'byId', id] as const,
  },
  auth: {
    isAdmin: (userId: string | undefined) => ['auth', 'is-admin', userId] as const,
  },
  poem: {
    like: (slug: string) => ['poems', slug, 'like'] as const,
    comments: (slug: string) => ['poems', slug, 'comments'] as const,
    search: (query: string) => ['poems', 'search', query] as const,
  },
  push: {
    subscription: () => ['push', 'subscription'] as const,
  },
} as const;
