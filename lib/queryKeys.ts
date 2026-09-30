/* Every React Query key, declared once. Readers and invalidators import from
   here; an inline key array is a second declaration of the same fact. */
export const queryKeys = {
  admin: {
    /** Every admin read. Admin writes invalidate this: views overlap (the
        dashboard counts what the lists show), so marking all stale is the
        one rule that cannot miss a view. Only mounted queries refetch. */
    all: () => ['admin'] as const,
    activity: () => ['admin', 'activity'] as const,
    comments: () => ['admin', 'comments'] as const,
    /** No status: the prefix, which invalidates every filtered list. */
    poems: (status?: string | null) =>
      status === undefined ? (['admin', 'poems'] as const) : (['admin', 'poems', status] as const),
    poem: (id: string) => ['admin', 'poems', 'byId', id] as const,
    /** No filter: the prefix, which invalidates every filtered list. */
    subscribers: (filter?: string) =>
      filter === undefined
        ? (['admin', 'subscribers'] as const)
        : (['admin', 'subscribers', filter] as const),
    sendData: () => ['admin', 'send-data'] as const,
    stats: () => ['admin', 'stats'] as const,
  },
  auth: {
    isAdmin: (userId: string | undefined) => ['auth', 'is-admin', userId] as const,
  },
  poem: {
    like: (slug: string) => ['poems', slug, 'like'] as const,
    comments: (slug: string) => ['poems', slug, 'comments'] as const,
    search: (query: string) => ['poems', 'search', query] as const,
  },
  subscriber: {
    /** Keyed by the emailed token: it is the only identity the page has. */
    preference: (token: string) => ['subscriber', 'preference', token] as const,
  },
  push: {
    subscription: () => ['push', 'subscription'] as const,
  },
} as const;
