'use client';

import { useSyncExternalStore } from 'react';

/* One breakpoint for "mobile", shared by every component that branches on it.
   Matches the 768px CSS breakpoint used across the modules. */
const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(listener: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}

function read() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/* Hydration-safe: the server snapshot says desktop, matching server-rendered
   HTML; the client corrects after mount without a setState-in-effect. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, read, () => false);
}
