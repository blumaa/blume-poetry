import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/config';
import { getAllPoemsMeta } from '@/lib/poems';
import { poemHref } from '@/lib/collections';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const poems = await getAllPoemsMeta('main');

  const poemEntries: MetadataRoute.Sitemap = poems.map((poem) => ({
    url: `${baseUrl}${poemHref('main', poem.slug)}`,
    lastModified: new Date(poem.updatedAt),
  }));

  return [
    {
      url: baseUrl,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
    },
    {
      url: `${baseUrl}/privacy`,
    },
    ...poemEntries,
  ];
}
