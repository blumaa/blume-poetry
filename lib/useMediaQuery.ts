'use client';

import { useSyncExternalStore } from 'react';

import { MOBILE_QUERY } from './mediaQueries';

/* Hydration-safe: the server snapshot is false, matching server-rendered
   HTML; the client corrects after mount without a setState-in-effect. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
