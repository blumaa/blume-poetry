import { queryMock, type QueryMock, type QueryResult } from '@/__tests__/supabaseMock';
import {
  fetchAdminPoems,
  fetchPoemById,
  revalidatePoems,
  savePoem,
  notifyPoem,
} from './poems';

let queries: QueryMock[] = [];
const next = (result: QueryResult) => {
  const q = queryMock(result);
  queries.push(q);
  return q;
};
const pending: QueryResult[] = [];

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => next(pending.shift() ?? {}) }),
}));

const fetchMock = jest.fn();
const respond = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  queries = [];
  pending.length = 0;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const dbError = { message: 'connection lost' };

describe('fetchAdminPoems', () => {
  it('filters by a known status', async () => {
    pending.push({ data: [] });
    await fetchAdminPoems('draft');
    expect(queries[0].argsOf('eq')).toEqual([['status', 'draft']]);
  });

  /* The list never shows a poem's body; it searches plain_text. */
  it('selects the list columns only, not the poem bodies', async () => {
    pending.push({ data: [] });
    await fetchAdminPoems(null);
    expect(queries[0].argsOf('select')).toEqual([[
      'id, slug, title, status, pinned, published_at, plain_text',
    ]]);
  });

  it('ignores an unknown status', async () => {
    pending.push({ data: [] });
    await fetchAdminPoems('bogus');
    expect(queries[0].argsOf('eq')).toEqual([]);
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(fetchAdminPoems(null)).rejects.toThrow('connection lost');
  });
});

describe('fetchPoemById', () => {
  it('returns null when no poem has the id', async () => {
    pending.push({ data: null });
    await expect(fetchPoemById('missing')).resolves.toBeNull();
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(fetchPoemById('p1')).rejects.toThrow('connection lost');
  });
});

describe('savePoem', () => {
  const input = {
    title: 'T',
    subtitle: null,
    slug: 't',
    content: '<p>x</p>',
    plain_text: 'x',
    status: 'draft' as const,
    published_at: '2026-01-01T00:00:00.000Z',
  };

  it('inserts a new poem and returns the saved row', async () => {
    pending.push({ data: { id: 'new-id', ...input } });
    await expect(savePoem(null, input)).resolves.toEqual({ id: 'new-id', ...input });
    expect(queries[0].argsOf('select')).toEqual([['*']]);
    expect(queries[0].argsOf('insert')).toEqual([[input]]);
  });

  it('updates an existing poem by id', async () => {
    pending.push({ data: { id: 'p1', ...input } });
    await expect(savePoem('p1', input)).resolves.toEqual({ id: 'p1', ...input });
    expect(queries[0].argsOf('update')).toEqual([[input]]);
    expect(queries[0].argsOf('eq')).toEqual([['id', 'p1']]);
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(savePoem(null, input)).rejects.toThrow('connection lost');
  });
});

describe('revalidatePoems', () => {
  /* A failed refresh leaves the public site stale; it must not pass silently. */
  it('throws when the server refuses', async () => {
    fetchMock.mockResolvedValue(respond(500, { error: 'Failed to revalidate' }));
    await expect(revalidatePoems()).rejects.toThrow('Failed to revalidate');
  });

  it('posts to the revalidate route', async () => {
    fetchMock.mockResolvedValue(respond(200, { revalidated: true }));
    await revalidatePoems();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/revalidate',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('notifyPoem', () => {
  it("returns the server's send result", async () => {
    fetchMock.mockResolvedValue(respond(200, { sent: 3 }));
    await expect(notifyPoem('p1')).resolves.toEqual({ sent: 3 });
  });

  it('throws the server error', async () => {
    fetchMock.mockResolvedValue(respond(500, { error: 'Failed to send notifications' }));
    await expect(notifyPoem('p1')).rejects.toThrow('Failed to send notifications');
  });
});
