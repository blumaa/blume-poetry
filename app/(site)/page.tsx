import type { Metadata } from 'next';
import { LatestPoemRoute } from '@/components/PoemRoute';

// No timer: cache tags refresh this page when its data changes (lib/cacheTags).
export const revalidate = false;

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <LatestPoemRoute collection="main" />;
}
