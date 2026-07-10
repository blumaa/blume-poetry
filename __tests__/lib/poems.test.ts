/** @jest-environment node */
import { getPoemIdBySlug } from '@/lib/poems';

const mockSingle = jest.fn();

function buildChain() {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.single = mockSingle;
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
