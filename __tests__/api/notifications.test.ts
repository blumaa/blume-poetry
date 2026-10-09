/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/notifications/route';
import { createEmailToken } from '@/lib/emailToken';
import { createUnsubscribeToken } from '@/lib/unsubscribeToken';
import { queryMock, type QueryMock, type QueryResult } from '@/__tests__/supabaseMock';

// Each request runs one query on `subscribers`; `row` is what it matched.
let result: QueryResult;
let queries: QueryMock[];
const fromMock = jest.fn(() => {
  const query = queryMock(result);
  queries.push(query);
  return query;
});
const updates = () => queries.flatMap((q) => q.argsOf('update'));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

jest.mock('@/lib/csrf', () => ({ verifyOrigin: () => null }));
jest.mock('@/lib/rateLimit', () => ({
  ...jest.requireActual('@/lib/rateLimit'),
  checkRateLimit: async () => null,
}));

function post(body: unknown) {
  return POST(
    new Request('https://site.test/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/notifications', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
    result = { data: { status: 'active' } };
    queries = [];
    fromMock.mockClear();
  });

  const token = () => createEmailToken('reader@example.com', 'notifications');

  it('turns notifications off for the token holder', async () => {
    const res = await post({ token: token(), action: 'off' });

    expect(res.status).toBe(200);
    expect(updates()).toEqual([[{ notify_new_poems: false }]]);
    expect(queries[0].argsOf('eq')).toEqual([['email', 'reader@example.com']]);
    await expect(res.json()).resolves.toMatchObject({ enabled: false });
  });

  it('turns notifications on for the token holder', async () => {
    const res = await post({ token: token(), action: 'on' });

    expect(res.status).toBe(200);
    expect(updates()).toEqual([[{ notify_new_poems: true }]]);
    await expect(res.json()).resolves.toMatchObject({ enabled: true });
  });

  it('sets rather than toggles, so a repeated request is a no-op', async () => {
    await post({ token: token(), action: 'off' });
    await post({ token: token(), action: 'off' });

    expect(updates()).toEqual([[{ notify_new_poems: false }], [{ notify_new_poems: false }]]);
  });

  it('rejects a forged token', async () => {
    const res = await post({ token: 'attacker.forged', action: 'off' });

    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects an unsubscribe token used for this endpoint', async () => {
    const res = await post({ token: createUnsubscribeToken('reader@example.com'), action: 'on' });

    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects a raw email in place of a token', async () => {
    const res = await post({ token: 'victim@example.com', action: 'off' });

    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown action', async () => {
    const res = await post({ token: token(), action: 'toggle' });

    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('says so when the address is no longer a subscriber, rather than reporting success', async () => {
    result = { data: null };

    const res = await post({ token: token(), action: 'on' });

    expect(res.status).toBe(404);
  });

  it('answers 500 when the database fails, rather than claiming the subscription is gone', async () => {
    result = { error: { message: 'connection lost' } };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post({ token: token(), action: 'on' });

    expect(res.status).toBe(500);
    jest.restoreAllMocks();
  });

  it('tells the page when the reader has unsubscribed from everything', async () => {
    result = { data: { status: 'unsubscribed' } };

    const res = await post({ token: token(), action: 'on' });

    await expect(res.json()).resolves.toMatchObject({ enabled: true, unsubscribed: true });
  });
});

describe('GET /api/notifications', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
    queries = [];
  });

  const get = () =>
    GET(
      new Request(
        `https://site.test/api/notifications?token=${createEmailToken('reader@example.com', 'notifications')}`
      )
    );

  it("returns the reader's current preference", async () => {
    result = { data: { notify_new_poems: false, status: 'active' } };

    const res = await get();

    await expect(res.json()).resolves.toEqual({
      email: 'reader@example.com',
      enabled: false,
      unsubscribed: false,
    });
  });

  it('answers 404 when the address is no longer a subscriber', async () => {
    result = { data: null };

    expect((await get()).status).toBe(404);
  });

  it('fails when the database fails, rather than claiming the subscription is gone', async () => {
    result = { error: { message: 'connection lost' } };

    await expect(get()).rejects.toThrow('connection lost');
  });
});
