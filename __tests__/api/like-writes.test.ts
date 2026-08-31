/**
 * @jest-environment node
 *
 * Security property: writes to `likes` must go through the service-role
 * client (createAdminClient), never the public anon client. The anon key's
 * RLS policies are being locked to read-only, so any write path still using
 * getAnonClient would silently stop working (or, before the DB is locked
 * down, would be a bypass of the API's CSRF/rate-limit/validation checks).
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/poems/[slug]/like/route';

const FIXED_POEM_ID = 'poem-123';

type ExistingLikeResult = { data: { id: string } | null; error: null };

// Service-role client mocks — the POST mutation MUST go through these.
const adminSingleSelect = jest.fn(
  async (): Promise<ExistingLikeResult> => ({ data: null, error: null })
);
const adminDeleteEq = jest.fn(async () => ({ error: null }));
const adminInsert = jest.fn(async () => ({ error: null }));
const adminFromMock = jest.fn(() => ({
  select: () => ({ eq: () => ({ eq: () => ({ single: adminSingleSelect }) }) }),
  delete: () => ({ eq: adminDeleteEq }),
  insert: adminInsert,
}));

// Public anon client mocks — must NEVER be touched by the like/unlike mutation.
const anonSingleSelect = jest.fn(
  async (): Promise<ExistingLikeResult> => ({ data: null, error: null })
);
const anonDeleteEq = jest.fn(async () => ({ error: null }));
const anonInsert = jest.fn(async () => ({ error: null }));
const anonFromMock = jest.fn(() => ({
  select: () => ({ eq: () => ({ eq: () => ({ single: anonSingleSelect }) }) }),
  delete: () => ({ eq: anonDeleteEq }),
  insert: anonInsert,
}));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: adminFromMock }),
}));

jest.mock('@/lib/supabase/anon', () => ({
  getAnonClient: () => ({ from: anonFromMock }),
}));

jest.mock('@/lib/poems', () => ({
  getPoemIdBySlug: async () => FIXED_POEM_ID,
  getPoemBySlug: async () => ({ id: FIXED_POEM_ID, title: 'Some Poem', slug: 'some-slug' }),
}));

jest.mock('@/lib/push', () => ({
  sendLikeNotification: async () => undefined,
}));

jest.mock('@/lib/csrf', () => ({
  verifyOrigin: () => null,
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: () => null,
  RATE_LIMITS: {
    likes: { limit: 30, windowMs: 60 * 1000 },
    comments: { limit: 10, windowMs: 5 * 60 * 1000 },
  },
}));

function post(body: unknown) {
  return POST(
    new NextRequest('https://site.test/api/poems/some-slug/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'some-slug' }) }
  );
}

describe('POST /api/poems/[slug]/like — writes go through the service-role client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts a new like via the service-role client, and never touches the anon client', async () => {
    adminSingleSelect.mockResolvedValueOnce({ data: null, error: null }); // not yet liked

    const res = await post({ visitorId: 'visitor-1' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ liked: true });

    expect(adminFromMock).toHaveBeenCalledWith('likes');
    expect(adminInsert).toHaveBeenCalledWith({ poem_id: FIXED_POEM_ID, visitor_id: 'visitor-1' });

    expect(anonFromMock).not.toHaveBeenCalled();
    expect(anonInsert).not.toHaveBeenCalled();
  });

  it('deletes an existing like via the service-role client, and never touches the anon client', async () => {
    adminSingleSelect.mockResolvedValueOnce({ data: { id: 'like-1' }, error: null }); // already liked

    const res = await post({ visitorId: 'visitor-1' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ liked: false });

    expect(adminFromMock).toHaveBeenCalledWith('likes');
    expect(adminDeleteEq).toHaveBeenCalledWith('id', 'like-1');

    expect(anonFromMock).not.toHaveBeenCalled();
    expect(anonDeleteEq).not.toHaveBeenCalled();
  });
});
