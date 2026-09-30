import type { ReactNode } from 'react';
import type { IconRender } from '@/components/mds';

/* The app's one icon set, drawn on a 24px grid. MDS never bundles glyphs;
   IconRegistry hands this map to its IconProvider and every icon in the app
   is <Icon name="..." />. Stroked by default; `filled` glyphs are solid. */

type Glyph = { filled?: boolean; body: ReactNode };

const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const GLYPHS = {
  add: { body: <path d="M12 5v14M5 12h14" /> },
  bell: {
    body: (
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
  },
  check: { body: <path d="M5 13l4 4L19 7" /> },
  'chevron-right': { body: <path d="m9 18 6-6-6-6" /> },
  'chevrons-left': {
    body: (
      <>
        <path d="M11 17l-5-5 5-5" />
        <path d="M18 17l-5-5 5-5" />
      </>
    ),
  },
  close: { body: <path d="M18 6 6 18M6 6l12 12" /> },
  comment: { body: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  dashboard: {
    body: (
      <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    ),
  },
  edit: {
    body: (
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
  },
  heart: { body: <path d={HEART} /> },
  'heart-filled': { filled: true, body: <path d={HEART} /> },
  info: {
    body: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    ),
  },
  /* Capricorn (lucide): a deliberately unconventional login mark. */
  login: {
    body: (
      <>
        <path d="M11 21a3 3 0 0 0 3-3V6.5a1 1 0 0 0-7 0" />
        <path d="M7 19V6a3 3 0 0 0-3-3h0" />
        <circle cx="17" cy="17" r="3" />
      </>
    ),
  },
  mail: {
    body: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </>
    ),
  },
  menu: { body: <path d="M3 6h18M3 12h18M3 18h18" /> },
  moon: { body: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> },
  pin: { filled: true, body: <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /> },
  sun: {
    body: (
      <>
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </>
    ),
  },
  users: {
    body: (
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

export const GLYPH_NAMES = Object.keys(GLYPHS) as IconName[];

/* The svg fills the MDS Icon span, which owns the size. */
export const renderGlyph: IconRender = (name) => {
  const glyph: Glyph | undefined = GLYPHS[name as IconName];
  if (!glyph) return null;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      {...(glyph.filled
        ? { fill: 'currentColor' }
        : {
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round' as const,
            strokeLinejoin: 'round' as const,
          })}
    >
      {glyph.body}
    </svg>
  );
};
