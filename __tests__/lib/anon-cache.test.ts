import { taggedFetch } from '@/lib/supabase/anon';
import { CACHE_REVALIDATE_SECONDS } from '@/lib/cacheTags';

describe('taggedFetch', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('reads through the data cache with the shared fallback and tags', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}'));
    global.fetch = fetchMock;

    await taggedFetch(['poems'])('https://example.test/rest', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/rest', {
      method: 'GET',
      next: { revalidate: CACHE_REVALIDATE_SECONDS, tags: ['poems'] },
    });
  });
});
