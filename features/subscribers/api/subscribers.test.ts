import { queryMock, type QueryMock, type QueryResult } from '@/__tests__/supabaseMock';
import {
  addSubscriber,
  fetchSendData,
  fetchSubscribers,
  sendNewsletter,
  subscribe,
} from './subscribers';

let queries: QueryMock[] = [];
const pending: QueryResult[] = [];

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => {
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
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const dbError = { message: 'connection lost' };

describe('fetchSubscribers', () => {
  it('filters by status unless all', async () => {
    pending.push({ data: [] }, { data: [] });
    await fetchSubscribers('active');
    await fetchSubscribers('all');
    expect(queries[0].argsOf('eq')).toEqual([['status', 'active']]);
    expect(queries[1].argsOf('eq')).toEqual([]);
  });

  it('throws on a database error', async () => {
    pending.push({ error: dbError });
    await expect(fetchSubscribers('all')).rejects.toThrow('connection lost');
  });
});

describe('fetchSendData', () => {
  it('returns recent poems and the active count', async () => {
    pending.push({ data: [{ id: 'p1' }] }, { count: 4 });
    await expect(fetchSendData()).resolves.toEqual({ poems: [{ id: 'p1' }], subscriberCount: 4 });
  });

  /* A failed count must not read as "0 subscribers". */
  it('throws when the count fails', async () => {
    pending.push({ data: [] }, { error: dbError });
    await expect(fetchSendData()).rejects.toThrow('connection lost');
  });
});

describe('subscribe', () => {
  it('posts the email and preference to the public endpoint', async () => {
    fetchMock.mockResolvedValue(respond(200, { message: 'ok' }));
    await subscribe({ email: 'a@x.com', notifyNewPoems: false });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscribe',
      expect.objectContaining({ body: '{"email":"a@x.com","notifyNewPoems":false}' })
    );
  });

  it('throws the server message', async () => {
    fetchMock.mockResolvedValue(respond(400, { error: 'This email is already subscribed' }));
    await expect(subscribe({ email: 'a@x.com', notifyNewPoems: true })).rejects.toThrow(
      'This email is already subscribed'
    );
  });
});

describe('addSubscriber', () => {
  it('posts the email alone to the admin endpoint', async () => {
    fetchMock.mockResolvedValue(respond(200, {}));
    await addSubscriber('a@x.com');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/subscribers',
      expect.objectContaining({ body: '{"email":"a@x.com"}' })
    );
  });
});

describe('sendNewsletter', () => {
  it('throws the server message', async () => {
    fetchMock.mockResolvedValue(respond(500, { error: 'No active subscribers' }));
    await expect(
      sendNewsletter({ subject: 's', bodyHtml: 'h', bodyText: 't' })
    ).rejects.toThrow('No active subscribers');
  });
});
