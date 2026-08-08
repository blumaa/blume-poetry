/** @jest-environment node */
import { getPoemIdBySlug, getAdjacentPoems } from '@/lib/poems';

const mockSingle = jest.fn();
const mockOrder = jest.fn();

function buildChain() {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.single = mockSingle;
  chain.order = mockOrder;
  return chain;
}

jest.mock('@/lib/supabase/anon', () => ({
  getCachedPoemClient: jest.fn(() => ({
    from: jest.fn(() => buildChain()),
  })),
  POEMS_CACHE_TAG: 'poems',
}));

describe('getPoemIdBySlug', () => {
  beforeEach(() => {
    mockSingle.mockReset();
  });

  it('returns the id on a hit', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'poem-123' }, error: null });

    const id = await getPoemIdBySlug('some-slug');

    expect(id).toBe('poem-123');
  });

  it('returns null when data is null', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const id = await getPoemIdBySlug('missing-slug');

    expect(id).toBeNull();
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
    mockOrder.mockReset();
    mockOrder.mockResolvedValue({ data: rows, error: null });
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
