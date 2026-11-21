import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CACHE_REVALIDATE_SECONDS } from '@/lib/cacheTags';

// Vercel bills Active CPU per server render. Public pages are refreshed on
// demand by cache tags (admin writes, comment writes), so the time-based ISR
// fallback only needs to catch out-of-band edits (direct SQL). A short timer
// re-renders every crawled page and used up the Hobby Active CPU quota.

const ONE_DAY = 86_400;

// Segment config must be a literal, so read it from source.
const segmentRevalidate = (page: string): number => {
  const src = readFileSync(resolve(__dirname, '../../app', page), 'utf8');
  const match = src.match(/export const revalidate = ([\d_]+);/);
  if (!match) throw new Error(`no revalidate export in ${page}`);
  return Number(match[1].replace(/_/g, ''));
};

describe('public page ISR fallback', () => {
  it('data cache fallback is one day', () => {
    expect(CACHE_REVALIDATE_SECONDS).toBe(ONE_DAY);
  });

  it.each([
    '(site)/page.tsx',
    '(site)/publications/page.tsx',
    '(site)/poem/[slug]/page.tsx',
    'kinky/page.tsx',
    'kinky/[slug]/page.tsx',
  ])('%s revalidates no more than once a day', (page) => {
    expect(segmentRevalidate(page)).toBe(CACHE_REVALIDATE_SECONDS);
  });
});
