import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';

/* Reachable only by its URL: kept out of search engines, the sitemap and
   robots.txt (a Disallow line would advertise the path). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function KinkyLayout({ children }: { children: React.ReactNode }) {
  return <PageShell collection="kinky">{children}</PageShell>;
}
