/** Minimal poem shape needed to build JSON-LD structured data */
export interface PoemForJsonLd {
  slug: string;
  title: string;
  publishedAt: string | null;
}

/**
 * Build a schema.org CreativeWork JSON-LD object for a poem.
 * Pure function — no side effects, safe to call at render time.
 */
export function buildPoemJsonLd(poem: PoemForJsonLd, siteUrl: string): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: poem.title,
    headline: poem.title,
    author: { '@type': 'Person', name: 'Desmond Blume' },
    url: `${siteUrl}/poem/${poem.slug}`,
    inLanguage: 'en',
  };

  if (poem.publishedAt) {
    jsonLd.datePublished = poem.publishedAt;
  }

  return jsonLd;
}
