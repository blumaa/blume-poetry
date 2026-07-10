/** @jest-environment node */
import { buildPoemJsonLd } from '@/lib/jsonLd';

describe('buildPoemJsonLd', () => {
  it('builds a schema.org CreativeWork with author and absolute url', () => {
    const jsonLd = buildPoemJsonLd(
      { slug: 'my-poem', title: 'My Poem', publishedAt: '2024-01-01T00:00:00.000Z' },
      'https://www.blumenouspoetry.com'
    );

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('CreativeWork');
    expect(jsonLd.author).toEqual({ '@type': 'Person', name: 'Desmond Blume' });
    expect(jsonLd.url).toBe('https://www.blumenouspoetry.com/poem/my-poem');
  });

  it('sets datePublished from publishedAt', () => {
    const jsonLd = buildPoemJsonLd(
      { slug: 'my-poem', title: 'My Poem', publishedAt: '2024-01-01T00:00:00.000Z' },
      'https://www.blumenouspoetry.com'
    );

    expect(jsonLd.datePublished).toBe('2024-01-01T00:00:00.000Z');
  });

  it('omits datePublished when publishedAt is null', () => {
    const jsonLd = buildPoemJsonLd(
      { slug: 'my-poem', title: 'My Poem', publishedAt: null },
      'https://www.blumenouspoetry.com'
    );

    expect(jsonLd.datePublished).toBeUndefined();
  });
});
