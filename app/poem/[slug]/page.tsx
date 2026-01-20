import { notFound } from 'next/navigation';
import { SidebarServer } from '@/components/SidebarServer';
import { PoemDisplay } from '@/components/PoemDisplay';
import { Footer } from '@/components/Footer';
import { getPoemBySlug, getAllPoemSlugs, getAdjacentPoems } from '@/lib/poems';

interface PoemPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPoemSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PoemPageProps) {
  const { slug } = await params;
  const poem = await getPoemBySlug(slug);

  if (!poem) {
    return { title: 'Poem Not Found | Blumenous Poetry' };
  }

  return {
    title: `${poem.title} | Blumenous Poetry`,
    description: poem.content.slice(0, 160),
  };
}

export default async function PoemPage({ params }: PoemPageProps) {
  const { slug } = await params;
  const poem = await getPoemBySlug(slug);

  if (!poem) {
    notFound();
  }

  const { prev, next } = await getAdjacentPoems(slug);

  return (
    <div className="min-h-screen has-sidebar">
      <SidebarServer />
      <main id="main-content" className="flex-1 flex flex-col">
        <div className="flex-1">
          <PoemDisplay poem={poem} prevPoem={prev} nextPoem={next} />
        </div>
        <Footer />
      </main>
    </div>
  );
}
