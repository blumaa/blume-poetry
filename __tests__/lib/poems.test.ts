/** @jest-environment node */
import {
  getPoemIdBySlug,
  getPoemBySlug,
  getAdjacentPoems,
  getAllPoems,
  getAllPoemsMeta,
  getRecentPoems,
} from '@/lib/poems';

/* A Supabase-style query builder: every modifier returns the chain, and
   awaiting it runs the query, resolving with mockResult. After throwOnError()
   a result carrying an error rejects instead, as supabase-js does. */
const mockResult = jest.fn();

function buildChain() {
  let throwing = false;
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.throwOnError = jest.fn(() => {
    throwing = true;
    return chain;
  });
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    const result = mockResult();
    return (
      throwing && result.error ? Promise.reject(new Error(result.error.message)) : Promise.resolve(result)
    ).then(resolve, reject);
  };
  return chain;
}

jest.mock('@/lib/supabase/anon', () => ({
  getCachedPoemClient: jest.fn(() => ({
    from: jest.fn(() => buildChain()),
  })),
  POEMS_CACHE_TAG: 'poems',
}));

const dbError = { message: 'connection refused' };

beforeEach(() => {
  mockResult.mockReset();
});

describe('getPoemIdBySlug', () => {
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
    ['getAllPoems', () => getAllPoems()],
    ['getAllPoemsMeta', () => getAllPoemsMeta()],
    ['getRecentPoems', () => getRecentPoems(1)],
  ])('%s throws on a database error', async (_name, load) => {
    mockResult.mockReturnValue({ data: null, error: dbError });
    await expect(load()).rejects.toThrow('connection refused');
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
