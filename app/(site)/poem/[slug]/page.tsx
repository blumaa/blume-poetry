import { PoemRoute, poemMetadata } from '@/components/PoemRoute';
import { getAllPoemSlugs } from '@/lib/poems';

// No timer: cache tags refresh this page when its data changes (lib/cacheTags).
export const revalidate = false;

interface PoemPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPoemSlugs('main');
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PoemPageProps) {
  const { slug } = await params;
  return poemMetadata({ collection: 'main', slug });
}

export default async function PoemPage({ params }: PoemPageProps) {
  const { slug } = await params;
  return <PoemRoute collection="main" slug={slug} />;
}
