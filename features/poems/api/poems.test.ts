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

  it('inserts a new poem and returns its id', async () => {
    pending.push({ data: { id: 'new-id' } });
    await expect(savePoem(null, input)).resolves.toBe('new-id');
    expect(queries[0].argsOf('insert')).toEqual([[input]]);
  });

  it('updates an existing poem by id', async () => {
    pending.push({ data: { id: 'p1' } });
    await expect(savePoem('p1', input)).resolves.toBe('p1');
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
    await expect(revalidatePoems(['/poem/x'])).rejects.toThrow('Failed to revalidate');
  });

  it('posts the paths', async () => {
    fetchMock.mockResolvedValue(respond(200, { revalidated: true }));
    await revalidatePoems(['/poem/x']);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/revalidate',
      expect.objectContaining({ method: 'POST', body: '{"paths":["/poem/x"]}' })
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
