import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/config';
import { getAllPoemsMeta } from '@/lib/poems';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const poems = await getAllPoemsMeta();

  const poemEntries: MetadataRoute.Sitemap = poems.map((poem) => ({
    url: `${baseUrl}/poem/${poem.slug}`,
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
