'use client';

import { useCallback } from 'react';
import { writeStored } from './browserStorage';
import { useStored } from './useStored';
import { useMediaQuery } from './useMediaQuery';
import { PREFERS_DARK_QUERY } from './mediaQueries';
import { resolveTheme } from './theme';

/* Derived, not held: storage + system preference are the only sources. */
export function useTheme() {
  const theme = resolveTheme(useStored('theme'), useMediaQuery(PREFERS_DARK_QUERY));
  const toggleTheme = useCallback(
    () => writeStored('theme', theme === 'light' ? 'dark' : 'light'),
    [theme]
  );
  return { theme, toggleTheme };
}
