import type { InvalidateQueryFilters, QueryClient, QueryKey } from '@tanstack/react-query';

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
    /** No filter: the prefix, which invalidates every filtered list. */
    subscribers: (filter?: string) =>
      filter === undefined
        ? (['admin', 'subscribers'] as const)
        : (['admin', 'subscribers', filter] as const),
    sendData: () => ['admin', 'send-data'] as const,
    stats: () => ['admin', 'stats'] as const,
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

/* The admin reads each kind of write makes stale, declared once. Views
   overlap (the dashboard counts what the lists show), so a new view that
   shows poems, subscribers or comments is added here, not at each call site. */
export const staleAfterWrite = {
  poems: () => [
    queryKeys.admin.poems(),
    queryKeys.admin.stats(),
    queryKeys.admin.sendData(),
    // The inbox shows poem titles.
    queryKeys.admin.activity(),
  ],
  subscribers: () => [
    queryKeys.admin.subscribers(),
    queryKeys.admin.stats(),
    queryKeys.admin.sendData(),
  ],
  comments: () => [
    queryKeys.admin.comments(),
    queryKeys.admin.stats(),
    queryKeys.admin.activity(),
  ],
};

/** Marks every key stale; mounted queries refetch unless `refetchType` says otherwise. */
export function invalidateKeys(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
  filters: Omit<InvalidateQueryFilters, 'queryKey'> = {}
) {
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ ...filters, queryKey })));
}
