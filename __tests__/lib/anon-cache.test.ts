import { taggedFetch } from '@/lib/supabase/anon';

describe('taggedFetch', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('caches reads until a tag expires them, with no timer', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}'));
    global.fetch = fetchMock;

    await taggedFetch(['poems'])('https://example.test/rest', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/rest', {
      method: 'GET',
      next: { revalidate: false, tags: ['poems'] },
    });
  });
});
