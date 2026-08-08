import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { PoemDisplay } from '@/components/PoemDisplay';
import { getRecentPoems, getAdjacentPoems } from '@/lib/poems';

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function Home() {
  const recentPoems = await getRecentPoems(1);
  const latestPoem = recentPoems[0];

  // Get adjacent poems for navigation — "prev" is older, "next" is newer
  const { prev, next } = latestPoem ? await getAdjacentPoems(latestPoem.slug) : { prev: null, next: null };

  return (
    <PageShell>
      {latestPoem && (
        <PoemDisplay poem={latestPoem} prevPoem={prev} nextPoem={next} />
      )}
    </PageShell>
  );
}
