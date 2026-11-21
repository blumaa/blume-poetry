import type { Metadata } from 'next';
import { LatestPoemRoute } from '@/components/PoemRoute';

// Must equal CACHE_REVALIDATE_SECONDS (lib/cacheTags); segment config needs a literal.
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <LatestPoemRoute collection="main" />;
}
