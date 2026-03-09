import { notFound } from 'next/navigation';
import { PoemDisplay } from '@/components/PoemDisplay';
import { getPoemBySlug, getAllPoemSlugs, getAdjacentPoems } from '@/lib/poems';

export const revalidate = 3600;

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

  const description = poem.plainText.slice(0, 160) || poem.content.slice(0, 160);

  return {
    title: `${poem.title} | Blumenous Poetry`,
    description,
    openGraph: {
      title: poem.title,
      description,
      type: 'article',
      siteName: 'Blumenous Poetry',
    },
    twitter: {
      card: 'summary',
      title: poem.title,
      description,
    },
  };
}

export default async function PoemPage({ params }: PoemPageProps) {
  const { slug } = await params;
  const poem = await getPoemBySlug(slug);

  if (!poem) {
    notFound();
  }

  const { prev, next } = await getAdjacentPoems(slug);

  return <PoemDisplay poem={poem} prevPoem={prev} nextPoem={next} />;
}
