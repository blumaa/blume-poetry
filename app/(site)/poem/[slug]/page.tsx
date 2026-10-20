import { PoemRoute, poemMetadata } from '@/components/PoemRoute';
import { getAllPoemSlugs } from '@/lib/poems';

export const revalidate = 3600;

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
