/** @jest-environment node */
import {
  getPoemIdBySlug,
  getPoemBySlug,
  getAdjacentPoems,
  getAllPoemsMeta,
  getRecentPoems,
  searchPoems,
  buildPoemTree,
  type PoemMeta,
} from '@/lib/poems';

// Each query resolves with whatever mockResult returns at the time.
const mockResult = jest.fn();
const mockRpc = jest.fn();
const mockQueries: Array<{ argsOf(method: string): unknown[][] }> = [];

jest.mock('@/lib/supabase/anon', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return {
    getCachedPoemClient: () => ({
      from: () => {
        const query = queryMock(mockResult());
        mockQueries.push(query);
        return query;
      },
    }),
    getAnonClient: () => ({
      rpc: (...args: unknown[]) => {
        mockRpc(...args);
        return queryMock(mockResult());
      },
    }),
    POEMS_CACHE_TAG: 'poems',
  };
});

const dbError = { message: 'connection refused' };

beforeEach(() => {
  mockResult.mockReset();
  mockQueries.length = 0;
});

describe('getPoemIdBySlug', () => {
  it('finds only published poems, so drafts take no likes or comments', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await getPoemIdBySlug('draft-slug');
    expect(mockQueries[0].argsOf('eq')).toContainEqual(['status', 'published']);
  });

  it('returns the id on a hit', async () => {
    mockResult.mockReturnValue({ data: { id: 'poem-123' }, error: null });
    await expect(getPoemIdBySlug('some-slug')).resolves.toBe('poem-123');
  });

  it('returns null when no poem has the slug', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await expect(getPoemIdBySlug('missing-slug')).resolves.toBeNull();
  });

  it('throws on a database error instead of reporting "not found"', async () => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(getPoemIdBySlug('some-slug')).rejects.toThrow('connection refused');
  });
});

describe('getPoemBySlug', () => {
  it('returns undefined when no poem has the slug', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await expect(getPoemBySlug('missing')).resolves.toBeUndefined();
  });

  /* A thrown error keeps the last good ISR page; a swallowed one would cache
     a 404 for a poem that exists. */
  it('throws on a database error', async () => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(getPoemBySlug('some-slug')).rejects.toThrow('connection refused');
  });
});

describe('poem lists', () => {
  /* Returning [] on error would regenerate and cache an empty site. */
  it.each([
    ['getAllPoemsMeta', () => getAllPoemsMeta()],
    ['getRecentPoems', () => getRecentPoems(1)],
  ])('%s throws on a database error', async (_name, load) => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(load()).rejects.toThrow('connection refused');
  });
});

describe('searchPoems', () => {
  it('searches in the database, not over every poem in memory', async () => {
    const hits = [{ id: '1', slug: 'rain', title: 'Rain' }];
    mockResult.mockReturnValue({ data: hits, error: null });

    await expect(searchPoems('rain')).resolves.toEqual(hits);
    expect(mockRpc).toHaveBeenCalledWith('search_poems', { p_query: 'rain' });
  });

  it('throws on a database error', async () => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(searchPoems('rain')).rejects.toThrow('connection refused');
  });
});

describe('getAdjacentPoems', () => {
  // Rows come back newest-first, matching the published_at desc query
  const rows = [
    { id: '3', slug: 'newest', title: 'Newest', subtitle: null, published_at: '2026-03-01', url: '', pinned: false },
    { id: '2', slug: 'middle', title: 'Middle', subtitle: null, published_at: '2026-02-01', url: '', pinned: false },
    { id: '1', slug: 'oldest', title: 'Oldest', subtitle: null, published_at: '2026-01-01', url: '', pinned: false },
  ];

  beforeEach(() => {
    mockResult.mockReturnValue({ data: rows, error: null });
  });

  it('points prev back in time and next forward in time', async () => {
    const { prev, next } = await getAdjacentPoems('middle');

    expect(prev?.slug).toBe('oldest');
    expect(next?.slug).toBe('newest');
  });

  it('has no next on the newest poem', async () => {
    const { prev, next } = await getAdjacentPoems('newest');

    expect(prev?.slug).toBe('middle');
    expect(next).toBeNull();
  });

  it('has no prev on the oldest poem', async () => {
    const { prev, next } = await getAdjacentPoems('oldest');

    expect(prev).toBeNull();
    expect(next?.slug).toBe('middle');
  });

  it('returns nulls for an unknown slug', async () => {
    const { prev, next } = await getAdjacentPoems('nope');

    expect(prev).toBeNull();
    expect(next).toBeNull();
  });
});

describe('buildPoemTree', () => {
  const meta = (id: string, title: string, publishedAt: string, pinned = false): PoemMeta => ({
    id, slug: id, title, subtitle: null, publishedAt, updatedAt: publishedAt, url: '', pinned,
  });
  const poems = [
    meta('b', 'Moon Over Water', '2025-03-01', true),
    meta('a', 'Autumn', '2024-01-01'),
  ];

  it('builds from the poems it is given, without a query', () => {
    const tree = buildPoemTree(poems);
    expect(mockQueries).toHaveLength(0);
    expect(tree.map((node) => node.id)).toEqual(['pinned', 'recent', 'series', 'years', 'all']);
  });

  it('groups by year, newest year first, and sorts All Poems by title', () => {
    const tree = buildPoemTree(poems);
    const years = tree.find((node) => node.id === 'years')!;
    expect(years.children!.map((node) => node.label)).toEqual(['2025', '2024']);
    const all = tree.find((node) => node.id === 'all')!;
    expect(all.children!.map((node) => node.label)).toEqual(['Autumn', 'Moon Over Water']);
  });

  it('leaves out Pinned and Series when nothing fits them', () => {
    const tree = buildPoemTree([meta('a', 'Autumn', '2024-01-01')]);
    expect(tree.map((node) => node.id)).toEqual(['recent', 'years', 'all']);
  });
});
