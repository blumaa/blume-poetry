/* Every React Query key, declared once. Readers and invalidators import from
   here; an inline key array is a second declaration of the same fact. */
export const queryKeys = {
  admin: {
    activity: () => ['admin', 'activity'] as const,
  },
} as const;
