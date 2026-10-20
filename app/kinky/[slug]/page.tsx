import { PoemRoute, poemMetadata } from '@/components/PoemRoute';
import { getAllPoemSlugs } from '@/lib/poems';

export const revalidate = 3600;

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
