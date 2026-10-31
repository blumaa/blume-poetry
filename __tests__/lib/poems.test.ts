/** @jest-environment node */
import {
  getPoemRefBySlug,
  getPoemBySlug,
  getAdjacentPoems,
  getAllPoemsMeta,
  getRecentPoems,
  searchPoems,
  buildPoemTree,
  type PoemMeta,
} from '@/lib/poems';

// Each query resolves with whatever mockResult returns at the time, and is
// recorded with the name of the client that ran it.
const mockResult = jest.fn();
const mockRpc = jest.fn();
const mockQueries: Array<{ client: string; argsOf(method: string): unknown[][] }> = [];

jest.mock('@/lib/supabase/anon', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  const client = (name: string) => () => ({
    from: () => {
      const query = queryMock(mockResult());
      mockQueries.push({ client: name, argsOf: query.argsOf });
      return query;
    },
    rpc: (...args: unknown[]) => {
      mockRpc(name, ...args);
      return queryMock(mockResult());
    },
  });
  return {
    getCachedPoemClient: client('cached-anon'),
    getCachedServiceClient: client('cached-service'),
    getAnonClient: client('anon'),
  };
});

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    rpc: (...args: unknown[]) => {
      mockRpc('service', ...args);
      const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
      return queryMock(mockResult());
    },
  }),
}));

const dbError = { message: 'connection refused' };

beforeEach(() => {
  mockResult.mockReset();
  mockRpc.mockReset();
  mockQueries.length = 0;
});

describe('getPoemRefBySlug', () => {
  it('finds only published poems, so drafts take no likes or comments', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await getPoemRefBySlug('draft-slug');
    expect(mockQueries[0].argsOf('eq')).toContainEqual(['status', 'published']);
  });

  /* Likes and comments work in every collection. The anon key cannot see
     kinky poems, so the lookup runs as the service role. */
  it('looks in every collection, with the service role', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await getPoemRefBySlug('some-slug');
    expect(mockQueries[0].client).toBe('cached-service');
    expect(mockQueries[0].argsOf('eq').map(([column]) => column)).not.toContain('collection');
  });

  it('returns the id, title and collection on a hit', async () => {
    const ref = { id: 'poem-123', title: 'Rain', collection: 'kinky' };
    mockResult.mockReturnValue({ data: ref, error: null });
    await expect(getPoemRefBySlug('some-slug')).resolves.toEqual(ref);
  });

  it('returns null when no poem has the slug', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await expect(getPoemRefBySlug('missing-slug')).resolves.toBeNull();
  });

  it('throws on a database error instead of reporting "not found"', async () => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(getPoemRefBySlug('some-slug')).rejects.toThrow('connection refused');
  });
});

describe('getPoemBySlug', () => {
  it('returns undefined when no poem has the slug', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    await expect(getPoemBySlug('main', 'missing')).resolves.toBeUndefined();
  });

  /* A thrown error keeps the last good ISR page; a swallowed one would cache
     a 404 for a poem that exists. */
  it('throws on a database error', async () => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(getPoemBySlug('main', 'some-slug')).rejects.toThrow('connection refused');
  });
});

/* Main poems are read with the anon key, which RLS limits to main. Kinky
   poems need the service role, and every query names its collection, so a
   slug never shows up under the other one's URL. */
describe('collection reads', () => {
  it.each([
    ['getAllPoemsMeta', (c: 'main' | 'kinky') => getAllPoemsMeta(c), []],
    ['getRecentPoems', (c: 'main' | 'kinky') => getRecentPoems(c, 1), []],
    ['getPoemBySlug', (c: 'main' | 'kinky') => getPoemBySlug(c, 'a-slug'), null],
  ])('%s reads main as anon and kinky as the service role', async (_name, load, empty) => {
    mockResult.mockReturnValue({ data: empty, error: null });

    await load('main');
    await load('kinky');

    expect(mockQueries.map((q) => q.client)).toEqual(['cached-anon', 'cached-service']);
    expect(mockQueries[0].argsOf('eq')).toContainEqual(['collection', 'main']);
    expect(mockQueries[1].argsOf('eq')).toContainEqual(['collection', 'kinky']);
  });

  it('tags each poem with its collection', async () => {
    const row = {
      id: '1', slug: 'rain', title: 'Rain', subtitle: null, content: '<p>x</p>',
      plain_text: 'x', published_at: '2026-01-01', url: null, collection: 'kinky',
    };
    mockResult.mockReturnValue({ data: row, error: null });
    await expect(getPoemBySlug('kinky', 'rain')).resolves.toMatchObject({ collection: 'kinky' });
  });
});

describe('poem lists', () => {
  /* Returning [] on error would regenerate and cache an empty site. */
  it.each([
    ['getAllPoemsMeta', () => getAllPoemsMeta('main')],
    ['getRecentPoems', () => getRecentPoems('main', 1)],
  ])('%s throws on a database error', async (_name, load) => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(load()).rejects.toThrow('connection refused');
  });
});

describe('searchPoems', () => {
  it('searches main in the database as anon', async () => {
    const hits = [{ id: '1', slug: 'rain', title: 'Rain' }];
    mockResult.mockReturnValue({ data: hits, error: null });

    await expect(searchPoems('main', 'rain')).resolves.toEqual(hits);
    expect(mockRpc).toHaveBeenCalledWith('anon', 'search_poems', { p_query: 'rain', p_collection: 'main' });
  });

  it('searches kinky as the service role', async () => {
    mockResult.mockReturnValue({ data: [], error: null });

    await searchPoems('kinky', 'rain');
    expect(mockRpc).toHaveBeenCalledWith('service', 'search_poems', { p_query: 'rain', p_collection: 'kinky' });
  });

  it('throws on a database error', async () => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(searchPoems('main', 'rain')).rejects.toThrow('connection refused');
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
    const { prev, next } = await getAdjacentPoems('main', 'middle');

    expect(prev?.slug).toBe('oldest');
    expect(next?.slug).toBe('newest');
  });

  it('has no next on the newest poem', async () => {
    const { prev, next } = await getAdjacentPoems('main', 'newest');

    expect(prev?.slug).toBe('middle');
    expect(next).toBeNull();
  });

  it('has no prev on the oldest poem', async () => {
    const { prev, next } = await getAdjacentPoems('main', 'oldest');

    expect(prev).toBeNull();
    expect(next?.slug).toBe('middle');
  });

  it('returns nulls for an unknown slug', async () => {
    const { prev, next } = await getAdjacentPoems('main', 'nope');

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
