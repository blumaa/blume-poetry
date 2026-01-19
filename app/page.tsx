import { SidebarServer } from '@/components/SidebarServer';
import { PoemDisplay } from '@/components/PoemDisplay';
import { getRecentPoems, getAdjacentPoems } from '@/lib/poems';

export default async function Home() {
  const recentPoems = await getRecentPoems(1);
  const latestPoem = recentPoems[0];

  // Get adjacent poems for navigation
  // Note: poems are sorted newest-first, so "next" is the older poem (arrow right)
  const { prev, next } = latestPoem ? await getAdjacentPoems(latestPoem.slug) : { prev: null, next: null };

  return (
    <div className="min-h-screen has-sidebar">
      <SidebarServer />
      <main id="main-content" className="flex-1">
        {latestPoem && (
          <PoemDisplay poem={latestPoem} prevPoem={prev} nextPoem={next} />
        )}
      </main>
    </div>
  );
}
