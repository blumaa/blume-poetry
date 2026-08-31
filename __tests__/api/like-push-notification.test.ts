/**
 * @jest-environment node
 *
 * A new like notifies the admin's devices; removing a like does not.
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/poems/[slug]/like/route';

const FIXED_POEM_ID = 'poem-123';

const singleSelect = jest.fn(
  async (): Promise<{ data: { id: string } | null; error: null }> => ({ data: null, error: null })
);
const deleteEq = jest.fn(async () => ({ error: null }));
const insert = jest.fn(async () => ({ error: null }));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: singleSelect }) }) }),
      delete: () => ({ eq: deleteEq }),
      insert,
    }),
  }),
}));

jest.mock('@/lib/supabase/anon', () => ({
  getAnonClient: () => ({ from: jest.fn() }),
}));

jest.mock('@/lib/poems', () => ({
  getPoemIdBySlug: async () => FIXED_POEM_ID,
  getPoemBySlug: async () => ({ id: FIXED_POEM_ID, title: 'Autumn Rain', slug: 'autumn-rain' }),
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

function post() {
  return POST(
    new NextRequest('https://site.test/api/poems/autumn-rain/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: 'visitor-1' }),
    }),
    { params: Promise.resolve({ slug: 'autumn-rain' }) }
  );
}

describe('POST /api/poems/[slug]/like — admin push notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies the admin when a poem gains a like', async () => {
    singleSelect.mockResolvedValueOnce({ data: null, error: null }); // not yet liked

    const res = await post();

    expect(res.status).toBe(200);
    expect(sendLikeNotification).toHaveBeenCalledWith({
      poemTitle: 'Autumn Rain',
      slug: 'autumn-rain',
    });
  });

  it('does not notify when a like is removed', async () => {
    singleSelect.mockResolvedValueOnce({ data: { id: 'like-1' }, error: null }); // already liked

    const res = await post();

    expect(res.status).toBe(200);
    expect(sendLikeNotification).not.toHaveBeenCalled();
  });
});
