import { notFound } from 'next/navigation';
import { PoemDisplay } from '@/components/PoemDisplay';
import { getPoemBySlug, getAllPoemSlugs, getAdjacentPoems } from '@/lib/poems';
import { getSiteUrl } from '@/lib/config';
import { buildPoemJsonLd } from '@/lib/jsonLd';

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
    alternates: {
      canonical: `/poem/${slug}`,
    },
    openGraph: {
      title: poem.title,
      description,
      url: `/poem/${slug}`,
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
  const [poem, { prev, next }] = await Promise.all([
    getPoemBySlug(slug),
    getAdjacentPoems(slug),
  ]);

  if (!poem) {
    notFound();
  }

  const jsonLd = buildPoemJsonLd(poem, getSiteUrl());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PoemDisplay poem={poem} prevPoem={prev} nextPoem={next} />
    </>
  );
}
