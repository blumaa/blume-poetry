import { STORAGE_KEYS } from './browserStorage';
import { PREFERS_DARK_QUERY } from './mediaQueries';

export type Theme = 'light' | 'dark';

/** A stored choice wins; otherwise follow the system. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

/* Runs in <head> before paint so the first frame has the right theme.
   Same rule as resolveTheme, built from the same registry. */
export const themeBootScript = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.theme.name)});
var t=(s==='light'||s==='dark')?s:(window.matchMedia(${JSON.stringify(PREFERS_DARK_QUERY)}).matches?'dark':'light');
document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();`;
