/**
 * @jest-environment node
 *
 * Security property: writes to `comments` must go through the service-role
 * client (createAdminClient), never the public anon client. See
 * __tests__/api/like-writes.test.ts for the full rationale.
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/poems/[slug]/comments/route';

const FIXED_POEM_ID = 'poem-123';
const NEW_COMMENT = {
  id: 'comment-1',
  author_name: 'Ada',
  content: 'Lovely poem.',
  created_at: '2026-01-01T00:00:00.000Z',
};

// Service-role client mocks — the POST mutation MUST go through these.
const adminSingle = jest.fn(async () => ({ data: NEW_COMMENT, error: null }));
const adminSelect = jest.fn(() => ({ single: adminSingle }));
const adminInsert = jest.fn(() => ({ select: adminSelect }));
const adminFromMock = jest.fn(() => ({ insert: adminInsert }));

// Public anon client mocks — must NEVER be touched by the comment-insert mutation.
const anonSingle = jest.fn(async () => ({ data: NEW_COMMENT, error: null }));
const anonSelect = jest.fn(() => ({ single: anonSingle }));
const anonInsert = jest.fn(() => ({ select: anonSelect }));
const anonFromMock = jest.fn(() => ({ insert: anonInsert }));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: adminFromMock }),
}));

jest.mock('@/lib/supabase/anon', () => ({
  getAnonClient: () => ({ from: anonFromMock }),
}));

jest.mock('@/lib/poems', () => ({
  getPoemIdBySlug: async () => FIXED_POEM_ID,
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
    new NextRequest('https://site.test/api/poems/some-slug/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'some-slug' }) }
  );
}

describe('POST /api/poems/[slug]/comments — writes go through the service-role client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts the new comment via the service-role client, and never touches the anon client', async () => {
    const res = await post({
      visitorId: 'visitor-1',
      authorName: 'Ada',
      content: 'Lovely poem.',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ comment: NEW_COMMENT });

    expect(adminFromMock).toHaveBeenCalledWith('comments');
    expect(adminInsert).toHaveBeenCalledWith({
      poem_id: FIXED_POEM_ID,
      visitor_id: 'visitor-1',
      author_name: 'Ada',
      content: 'Lovely poem.',
    });

    expect(anonFromMock).not.toHaveBeenCalled();
    expect(anonInsert).not.toHaveBeenCalled();
  });

  it('still rejects honeypot-tripped submissions without writing (existing validation preserved)', async () => {
    const res = await post({
      visitorId: 'visitor-1',
      authorName: 'Bot',
      content: 'spam',
      honeypot: 'filled-in',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(adminInsert).not.toHaveBeenCalled();
    expect(anonInsert).not.toHaveBeenCalled();
  });
});
