import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_NAME } from '@/lib/brand';
import { PoemDisplay } from '@/components/PoemDisplay';
import { getAdjacentPoems, getPoemBySlug, getRecentPoems } from '@/lib/poems';
import { poemHref, type PoemCollection } from '@/lib/collections';
import { getSiteUrl } from '@/lib/config';
import { buildPoemJsonLd } from '@/lib/jsonLd';

/* What a collection's poem routes render. Each route file stays thin: it
   names its collection and keeps its own segment config. */

interface PoemRouteProps {
  collection: PoemCollection;
  slug: string;
}

export async function poemMetadata({ collection, slug }: PoemRouteProps): Promise<Metadata> {
  const poem = await getPoemBySlug(collection, slug);

  if (!poem) {
    return { title: 'Poem Not Found' };
  }

  const description = poem.plainText.slice(0, 160) || poem.content.slice(0, 160);
  const url = poemHref(collection, slug);

  return {
    title: poem.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: poem.title,
      description,
      url,
      type: 'article',
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary',
      title: poem.title,
      description,
    },
  };
}

export async function PoemRoute({ collection, slug }: PoemRouteProps) {
  const [poem, { prev, next }] = await Promise.all([
    getPoemBySlug(collection, slug),
    getAdjacentPoems(collection, slug),
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

/** A collection's home: its newest poem. */
export async function LatestPoemRoute({ collection }: { collection: PoemCollection }) {
  const [latestPoem] = await getRecentPoems(collection, 1);
  if (!latestPoem) return null;

  // "prev" is older, "next" is newer
  const { prev, next } = await getAdjacentPoems(collection, latestPoem.slug);
  return <PoemDisplay poem={latestPoem} prevPoem={prev} nextPoem={next} />;
}
