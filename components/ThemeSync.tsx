'use client';

import { useEffect } from 'react';
import { readStored, subscribeStored } from '@/lib/browserStorage';
import { PREFERS_DARK_QUERY } from '@/lib/mediaQueries';
import { resolveTheme } from '@/lib/theme';

/** Keeps <html data-theme> in step with storage and the system after the boot
    script's first paint. Reads the sources directly, not a hook: a hook reports
    the server snapshot during hydration and would repaint the wrong theme. */
export function ThemeSync() {
  useEffect(() => {
    const mql = window.matchMedia(PREFERS_DARK_QUERY);
    const apply = () =>
      document.documentElement.setAttribute(
        'data-theme',
        resolveTheme(readStored('theme'), mql.matches)
      );
    apply();
    const unsubscribe = subscribeStored('theme', apply);
    mql.addEventListener('change', apply);
    return () => {
      unsubscribe();
      mql.removeEventListener('change', apply);
    };
  }, []);
  return null;
}
