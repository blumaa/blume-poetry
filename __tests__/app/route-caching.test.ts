import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vercel bills Active CPU per server render. Public pages are refreshed only
// on demand by cache tags (admin writes, comment writes). No timer: a timed
// expiry re-renders every crawled page whether or not anything changed.

// Segment config must be a literal, so read it from source.
const segmentRevalidate = (page: string): string => {
  const src = readFileSync(resolve(__dirname, '../../app', page), 'utf8');
  const match = src.match(/export const revalidate = (\w+);/);
  if (!match) throw new Error(`no revalidate export in ${page}`);
  return match[1];
};

describe('public page caching', () => {
  it.each([
    '(site)/page.tsx',
    '(site)/publications/page.tsx',
    '(site)/poem/[slug]/page.tsx',
    'kinky/page.tsx',
    'kinky/[slug]/page.tsx',
  ])('%s never expires on a timer', (page) => {
    expect(segmentRevalidate(page)).toBe('false');
  });
});
