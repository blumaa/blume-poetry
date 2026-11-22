import type { Metadata } from 'next';
import { LatestPoemRoute } from '@/components/PoemRoute';

// No timer: cache tags refresh this page when its data changes (lib/cacheTags).
export const revalidate = false;

export const metadata: Metadata = {
  alternates: {
    canonical: '/kinky',
  },
};

export default function KinkyHome() {
  return <LatestPoemRoute collection="kinky" />;
}
