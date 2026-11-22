import { PoemRoute, poemMetadata } from '@/components/PoemRoute';
import { getAllPoemSlugs } from '@/lib/poems';

// No timer: cache tags refresh this page when its data changes (lib/cacheTags).
export const revalidate = false;

interface KinkyPoemPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPoemSlugs('kinky');
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: KinkyPoemPageProps) {
  const { slug } = await params;
  return poemMetadata({ collection: 'kinky', slug });
}

export default async function KinkyPoemPage({ params }: KinkyPoemPageProps) {
  const { slug } = await params;
  return <PoemRoute collection="kinky" slug={slug} />;
}
