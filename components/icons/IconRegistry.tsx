'use client';

import type { ReactNode } from 'react';
import { IconProvider } from '@/components/mds';
import { renderGlyph } from './glyphs';

/* A render function cannot cross from a server layout to a client provider,
   so the registration lives in this client component. */
export function IconRegistry({ children }: { children: ReactNode }) {
  return <IconProvider render={renderGlyph}>{children}</IconProvider>;
}
