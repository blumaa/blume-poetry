/**
 * @jest-environment node
 *
 * Security property: writes to `comments` must go through the service-role
 * client (createAdminClient), never the public anon client. See
 * __tests__/api/like.test.ts for the full rationale.
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/poems/[slug]/comments/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

const FIXED_POEM_ID = 'poem-123';
const NEW_COMMENT = {
  id: 'comment-1',
  author_name: 'Ada',
  content: 'Lovely poem.',
  created_at: '2026-01-01T00:00:00.000Z',
};

let adminClient: ReturnType<typeof clientMock>;
const anonClient = clientMock({});

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/supabase/anon', () => ({
  getAnonClient: () => anonClient,
}));

jest.mock('@/lib/poems', () => ({
  getPoemIdBySlug: async () => FIXED_POEM_ID,
}));

jest.mock('@/lib/csrf', () => ({
  verifyOrigin: () => null,
}));

jest.mock('@/lib/rateLimit', () => ({
  ...jest.requireActual('@/lib/rateLimit'),
  checkRateLimit: async () => null,
}));

function post(body: unknown) {
  return POST(
    new NextRequest('https://site.test/api/poems/some-slug/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'some-slug' }) }
  );
}

const valid = { visitorId: 'visitor-1', authorName: '  Ada ', content: ' Lovely poem. ' };

describe('POST /api/poems/[slug]/comments', () => {
  let insert: ReturnType<typeof queryMock>;

  beforeEach(() => {
    insert = queryMock({ data: NEW_COMMENT });
    adminClient = clientMock({ comments: [insert] });
  });

  it('inserts the trimmed comment via the service-role client and answers it', async () => {
    const res = await post(valid);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ comment: NEW_COMMENT });
    expect(insert.argsOf('insert')[0][0]).toEqual({
      poem_id: FIXED_POEM_ID,
      visitor_id: 'visitor-1',
      author_name: 'Ada',
      content: 'Lovely poem.',
    });
    expect(anonClient.from).not.toHaveBeenCalled();
  });

  it('silently accepts a honeypot-tripped submission without writing', async () => {
    const res = await post({ ...valid, honeypot: 'filled-in' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('rejects a submission sent too soon after the form opened', async () => {
    const res = await post({ ...valid, timestamp: Date.now() });

    expect(res.status).toBe(400);
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...valid, authorName: '   ' }, 'Name and comment are required'],
    [{ ...valid, content: undefined }, 'Name and comment are required'],
    [{ ...valid, visitorId: 42 }, 'Name and comment are required'],
    [{ ...valid, content: 'x'.repeat(2001) }, 'Comment is too long'],
  ])('rejects an invalid body with 400 (%#)', async (body, message) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message });
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('answers 400 for a body that is not JSON', async () => {
    const res = await post('not json');
    expect(res.status).toBe(400);
  });

  it('throws when the insert fails, so Next answers 500', async () => {
    adminClient = clientMock({ comments: [queryMock({ error: { message: 'db down' } })] });
    await expect(post(valid)).rejects.toThrow('db down');
  });
});
