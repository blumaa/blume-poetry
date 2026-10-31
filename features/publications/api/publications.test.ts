import { queryMock, type QueryMock, type QueryResult } from '@/__tests__/supabaseMock';
import {
  deletePublication,
  fetchAdminPublications,
  revalidatePublications,
  savePublication,
} from './publications';

let queries: QueryMock[] = [];
const pending: QueryResult[] = [];
const tables: string[] = [];

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      tables.push(table);
      const q = queryMock(pending.shift() ?? {});
      queries.push(q);
      return q;
    },
  }),
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
  tables.length = 0;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const dbError = { message: 'connection lost' };

const entry = {
  poem_id: 'p1',
  poem_title: 'Heat Break',
  journal: 'The Broken Spine',
  url: null,
  published_on: '2024-12-01',
};

describe('fetchAdminPublications', () => {
  it('lists every publication, newest first', async () => {
    pending.push({ data: [] });
    await fetchAdminPublications();
    expect(tables).toEqual(['publications']);
    expect(queries[0].argsOf('order')).toEqual([['published_on', { ascending: false }]]);
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(fetchAdminPublications()).rejects.toThrow('connection lost');
  });
});

describe('savePublication', () => {
  it('inserts when there is no id, and returns the saved row', async () => {
    pending.push({ data: { id: 'pub1', ...entry } });
    await expect(savePublication(null, entry)).resolves.toEqual({ id: 'pub1', ...entry });
    expect(queries[0].argsOf('insert')).toEqual([[entry]]);
  });

  it('updates the row with the id', async () => {
    pending.push({ data: { id: 'pub1', ...entry } });
    await savePublication('pub1', entry);
    expect(queries[0].argsOf('update')).toEqual([[entry]]);
    expect(queries[0].argsOf('eq')).toEqual([['id', 'pub1']]);
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(savePublication(null, entry)).rejects.toThrow('connection lost');
  });
});

describe('deletePublication', () => {
  it('deletes the row with the id', async () => {
    pending.push({});
    await deletePublication('pub1');
    expect(queries[0].argsOf('delete')).toEqual([[]]);
    expect(queries[0].argsOf('eq')).toEqual([['id', 'pub1']]);
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(deletePublication('pub1')).rejects.toThrow('connection lost');
  });
});

describe('revalidatePublications', () => {
  it('posts the publications scope to the revalidate route', async () => {
    fetchMock.mockResolvedValue(respond(200, { revalidated: true }));
    await revalidatePublications();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/revalidate',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ scope: 'publications' }) })
    );
  });

  /* A failed refresh leaves the public page stale; it must not pass silently. */
  it('throws when the server refuses', async () => {
    fetchMock.mockResolvedValue(respond(500, { error: 'Failed to revalidate' }));
    await expect(revalidatePublications()).rejects.toThrow('Failed to revalidate');
  });
});
