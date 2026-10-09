/**
 * @jest-environment node
 *
 * /api/poems/[slug]/like
 * - writes go through the service-role client, never the anon client (the
 *   anon key's RLS policies are read-only)
 * - a toggle is one atomic database call that returns the new state
 * - a new like notifies the admin's devices after the response; removing one
 *   does not
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

// after() needs a live request scope; collect the callbacks and run them by hand.
let afterCallbacks: Array<() => unknown> = [];
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: (callback: () => unknown) => afterCallbacks.push(callback),
}));

async function runAfter() {
  await Promise.all(afterCallbacks.map((callback) => callback()));
}

jest.mock('@/lib/csrf', () => ({
  verifyOrigin: () => null,
}));

jest.mock('@/lib/rateLimit', () => ({
  ...jest.requireActual('@/lib/rateLimit'),
  checkRateLimit: async () => null,
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
  afterCallbacks = [];
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
  it('likes in one atomic call and answers with the new state', async () => {
    const toggle = queryMock({ data: { liked: true, like_count: 5 } });
    adminClient = clientMock({ toggle_like: [toggle] });

    const res = await post();

    expect(await res.json()).toEqual({ count: 5, hasLiked: true });
    expect(toggle.argsOf('rpc')).toEqual([[{ p_poem_id: POEM_ID, p_visitor_id: 'visitor-1' }]]);
    expect(adminClient.from).not.toHaveBeenCalled();
    expect(anonClient.from).not.toHaveBeenCalled();
  });

  it('notifies the admin after the response, not before', async () => {
    adminClient = clientMock({
      toggle_like: [queryMock({ data: { liked: true, like_count: 5 } })],
    });

    await post();
    expect(sendLikeNotification).not.toHaveBeenCalled();

    await runAfter();
    expect(sendLikeNotification).toHaveBeenCalledWith({
      poemTitle: 'Autumn Rain',
      slug: 'autumn-rain',
    });
  });

  it('unlikes without notifying', async () => {
    adminClient = clientMock({
      toggle_like: [queryMock({ data: { liked: false, like_count: 4 } })],
    });

    const res = await post();
    await runAfter();

    expect(await res.json()).toEqual({ count: 4, hasLiked: false });
    expect(sendLikeNotification).not.toHaveBeenCalled();
  });

  it('fails and does not notify when the toggle fails', async () => {
    adminClient = clientMock({ toggle_like: [queryMock({ error: dbError })] });

    await expect(post()).rejects.toThrow('connection lost');
    await runAfter();
    expect(sendLikeNotification).not.toHaveBeenCalled();
  });
});
