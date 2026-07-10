/** @jest-environment node */
jest.mock('@/lib/poems', () => ({
  getAllPoemsMeta: jest.fn(),
}));
jest.mock('@/lib/config', () => ({
  getSiteUrl: jest.fn(),
}));

import sitemap from '@/app/sitemap';
import { getAllPoemsMeta } from '@/lib/poems';
import { getSiteUrl } from '@/lib/config';

const BASE_URL = 'https://www.blumenouspoetry.com';

describe('sitemap', () => {
  beforeEach(() => {
    (getSiteUrl as jest.Mock).mockReturnValue(BASE_URL);
    (getAllPoemsMeta as jest.Mock).mockResolvedValue([
      {
        id: '1',
        slug: 'poem-one',
        title: 'Poem One',
        subtitle: null,
        publishedAt: '2024-01-01T00:00:00.000Z',
        url: '',
        pinned: false,
      },
      {
        id: '2',
        slug: 'poem-two',
        title: 'Poem Two',
        subtitle: null,
        publishedAt: '2024-02-01T00:00:00.000Z',
        url: '',
        pinned: false,
      },
    ]);
  });

  it('includes the home URL with top priority', async () => {
    const result = await sitemap();

    const home = result.find((entry) => entry.url === BASE_URL);
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1);
  });

  it('includes an absolute entry per poem with lastModified from publishedAt', async () => {
    const result = await sitemap();

    const poemOne = result.find((entry) => entry.url === `${BASE_URL}/poem/poem-one`);
    expect(poemOne).toBeDefined();
    expect(poemOne?.lastModified).toEqual(new Date('2024-01-01T00:00:00.000Z'));

    const poemTwo = result.find((entry) => entry.url === `${BASE_URL}/poem/poem-two`);
    expect(poemTwo).toBeDefined();
    expect(poemTwo?.lastModified).toEqual(new Date('2024-02-01T00:00:00.000Z'));
  });

  it('includes static entries for /about and /privacy', async () => {
    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain(`${BASE_URL}/about`);
    expect(urls).toContain(`${BASE_URL}/privacy`);
  });

  it('excludes admin, api, unsubscribe, and offline routes', async () => {
    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls.some((url) => url.includes('/admin'))).toBe(false);
    expect(urls.some((url) => url.includes('/api'))).toBe(false);
    expect(urls.some((url) => url.includes('/unsubscribe'))).toBe(false);
    expect(urls.some((url) => url.includes('/offline'))).toBe(false);
  });
});
