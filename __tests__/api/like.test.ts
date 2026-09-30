/**
 * @jest-environment node
 *
 * /api/poems/[slug]/like
 * - writes go through the service-role client, never the anon client (the
 *   anon key's RLS policies are read-only)
 * - a new like notifies the admin's devices; removing one does not
 * - a database error fails the request instead of passing as "no like"
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/poems/[slug]/like/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

const POEM_ID = 'poem-123';
const dbError = { message: 'connection lost' };

let adminClient: ReturnType<typeof clientMock>;
let anonClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/supabase/anon', () => ({
  getAnonClient: () => anonClient,
}));

jest.mock('@/lib/poems', () => ({
  getPoemIdBySlug: async () => POEM_ID,
  getPoemBySlug: async () => ({ id: POEM_ID, title: 'Autumn Rain', slug: 'autumn-rain' }),
}));

const sendLikeNotification: jest.Mock = jest.fn(async () => undefined);
jest.mock('@/lib/push', () => ({
  // Deferred so the hoisted factory doesn't touch the const before init.
  sendLikeNotification: (arg: unknown) => sendLikeNotification(arg),
}));

jest.mock('@/lib/csrf', () => ({
  verifyOrigin: () => null,
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: () => null,
  RATE_LIMITS: { likes: { limit: 30, windowMs: 60 * 1000 } },
}));

const params = { params: Promise.resolve({ slug: 'autumn-rain' }) };

function post() {
  return POST(
    new NextRequest('https://site.test/api/poems/autumn-rain/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: 'visitor-1' }),
    }),
    params
  );
}

function get() {
  return GET(
    new NextRequest('https://site.test/api/poems/autumn-rain/like', {
      headers: { 'x-visitor-id': 'visitor-1' },
    }),
    params
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  anonClient = clientMock({});
});

describe('GET', () => {
  it("returns the count and whether this visitor liked the poem", async () => {
    anonClient = clientMock({
      likes: [queryMock({ count: 4 }), queryMock({ data: { id: 'like-1' } })],
    });

    const res = await get();

    expect(await res.json()).toEqual({ count: 4, hasLiked: true });
  });

  it('fails when the count cannot be read, instead of showing 0 likes', async () => {
    anonClient = clientMock({
      likes: [queryMock({ error: dbError }), queryMock({ data: null })],
    });

    await expect(get()).rejects.toThrow('connection lost');
  });

  it("fails when the visitor's like cannot be read", async () => {
    anonClient = clientMock({
      likes: [queryMock({ count: 4 }), queryMock({ error: dbError })],
    });

    await expect(get()).rejects.toThrow('connection lost');
  });
});

describe('POST', () => {
  it('likes via the service-role client and notifies the admin', async () => {
    const insert = queryMock();
    adminClient = clientMock({ likes: [queryMock({ data: null }), insert] });

    const res = await post();

    expect(await res.json()).toEqual({ liked: true });
    expect(insert.argsOf('insert')).toEqual([[{ poem_id: POEM_ID, visitor_id: 'visitor-1' }]]);
    expect(anonClient.from).not.toHaveBeenCalled();
    expect(sendLikeNotification).toHaveBeenCalledWith({
      poemTitle: 'Autumn Rain',
      slug: 'autumn-rain',
    });
  });

  it('unlikes via the service-role client without notifying', async () => {
    const remove = queryMock();
    adminClient = clientMock({ likes: [queryMock({ data: { id: 'like-1' } }), remove] });

    const res = await post();

    expect(await res.json()).toEqual({ liked: false });
    expect(remove.argsOf('eq')).toEqual([['id', 'like-1']]);
    expect(anonClient.from).not.toHaveBeenCalled();
    expect(sendLikeNotification).not.toHaveBeenCalled();
  });

  it('does not add a like when the existing-like lookup fails', async () => {
    const insert = queryMock();
    adminClient = clientMock({ likes: [queryMock({ error: dbError }), insert] });

    await expect(post()).rejects.toThrow('connection lost');
    expect(insert.calls).toEqual([]);
  });

  it('does not report an unlike that failed', async () => {
    adminClient = clientMock({
      likes: [queryMock({ data: { id: 'like-1' } }), queryMock({ error: dbError })],
    });

    await expect(post()).rejects.toThrow('connection lost');
  });

  it('does not notify for a like that failed', async () => {
    adminClient = clientMock({
      likes: [queryMock({ data: null }), queryMock({ error: dbError })],
    });

    await expect(post()).rejects.toThrow('connection lost');
    expect(sendLikeNotification).not.toHaveBeenCalled();
  });
});
