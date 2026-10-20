import type { Metadata } from 'next';
import { LatestPoemRoute } from '@/components/PoemRoute';

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <LatestPoemRoute collection="main" />;
}
