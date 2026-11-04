/**
 * @jest-environment node
 *
 * Security property: writes to `comments` must go through the service-role
 * client (createAdminClient), never the public anon client. See
 * __tests__/api/like.test.ts for the full rationale.
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/poems/[slug]/comments/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

const FIXED_POEM_ID = 'poem-123';
const NEW_COMMENT = {
  id: 'comment-1',
  parent_id: null,
  author_name: 'Ada',
  content: 'Lovely poem.',
  created_at: '2026-01-01T00:00:00.000Z',
  removed_at: null,
};
const PARENT_ID = '11111111-1111-4111-8111-111111111111';

let adminClient: ReturnType<typeof clientMock>;
let anonClient = clientMock({});

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/supabase/anon', () => ({
  getAnonClient: () => anonClient,
  getCachedCommentClient: () => anonClient,
}));

// A write expires the cached comment reads, so the static poem page shows it.
const mockRevalidateTag = jest.fn();
jest.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

jest.mock('@/lib/poems', () => ({
  getPoemRefBySlug: async () => ({ id: FIXED_POEM_ID, title: 'A poem', collection: 'main' }),
}));

const mockNotify = jest.fn<Promise<void>, [unknown]>(async () => {});
jest.mock('@/lib/commentReplies', () => ({
  notifyCommentReply: (reply: unknown) => mockNotify(reply),
}));

// Runs the scheduled work at once, so a test can see what was scheduled.
const mockAfter = jest.fn((task: () => unknown) => task());
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: (task: () => unknown) => mockAfter(task),
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
    adminClient = clientMock({ add_comment: [insert] });
    mockNotify.mockClear();
    mockAfter.mockClear();
    mockRevalidateTag.mockClear();
  });

  it('saves the trimmed comment in one call via the service-role client and answers it', async () => {
    const res = await post(valid);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ comment: NEW_COMMENT });
    // No parent, no email: left out of the call, so the function's null defaults apply.
    expect(JSON.parse(JSON.stringify(insert.argsOf('rpc')[0][0]))).toEqual({
      p_poem_id: FIXED_POEM_ID,
      p_visitor_id: 'visitor-1',
      p_author_name: 'Ada',
      p_content: 'Lovely poem.',
    });
    expect(insert.argsOf('select')[0][0]).toBe(
      'id, parent_id, author_name, content, created_at, removed_at'
    );
    expect(anonClient.from).not.toHaveBeenCalled();
  });

  it('expires the cached comments at once, so the next page render shows the new one', async () => {
    await post(valid);
    expect(mockRevalidateTag).toHaveBeenCalledWith('comments', { expire: 0 });
  });

  it('expires nothing when nothing was saved', async () => {
    await post({ ...valid, honeypot: 'filled-in' });
    await post({ ...valid, authorName: '   ' });
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('keeps an email given for reply notices, normalized, and never answers it back', async () => {
    const res = await post({ ...valid, email: '  Ada@Example.COM ' });

    expect(insert.argsOf('rpc')[0][0]).toMatchObject({ p_email: 'ada@example.com' });
    expect(JSON.stringify(await res.json())).not.toContain('example');
  });

  it('treats a blank email as none', async () => {
    await post({ ...valid, email: '   ' });
    expect(insert.argsOf('rpc')[0][0]).toMatchObject({ p_email: undefined });
  });

  it('a top-level comment notifies no one', async () => {
    await post(valid);
    expect(mockAfter).not.toHaveBeenCalled();
  });

  it('saves a reply under a live comment on the same poem, then tells its author after answering', async () => {
    const parent = queryMock({ data: { id: PARENT_ID } });
    adminClient = clientMock({ comments: [parent], add_comment: [insert] });

    const res = await post({ ...valid, parentId: PARENT_ID, email: 'des@example.com' });

    expect(res.status).toBe(200);
    expect(parent.argsOf('eq')).toEqual([
      ['id', PARENT_ID],
      ['poem_id', FIXED_POEM_ID],
    ]);
    expect(parent.argsOf('is')).toEqual([['removed_at', null]]);
    expect(insert.argsOf('rpc')[0][0]).toMatchObject({ p_parent_id: PARENT_ID });
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith({
      parentId: PARENT_ID,
      authorName: 'Ada',
      content: 'Lovely poem.',
      replierEmail: 'des@example.com',
      poem: { title: 'A poem', slug: 'some-slug', collection: 'main' },
    });
  });

  it('refuses a reply to a comment that is gone or on another poem, without writing', async () => {
    const parent = queryMock({ data: null });
    adminClient = clientMock({ comments: [parent] });

    const res = await post({ ...valid, parentId: PARENT_ID });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'That comment can no longer be replied to' });
    expect(adminClient.from).toHaveBeenCalledTimes(1);
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('silently accepts a honeypot-tripped submission without writing', async () => {
    const res = await post({ ...valid, honeypot: 'filled-in' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(adminClient.from).not.toHaveBeenCalled();
    expect(adminClient.rpc).not.toHaveBeenCalled();
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
    [{ ...valid, parentId: 'not-an-id' }, 'Invalid reply'],
    [{ ...valid, email: 'not-an-email' }, 'Invalid email'],
  ])('rejects an invalid body with 400 (%#)', async (body, message) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message });
    expect(adminClient.from).not.toHaveBeenCalled();
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('answers 400 for a body that is not JSON', async () => {
    const res = await post('not json');
    expect(res.status).toBe(400);
  });

  it('throws when the insert fails, so Next answers 500', async () => {
    adminClient = clientMock({ add_comment: [queryMock({ error: { message: 'db down' } })] });
    await expect(post(valid)).rejects.toThrow('db down');
  });
});

describe('GET /api/poems/[slug]/comments', () => {
  it('answers every comment on the poem in written order, tombstones included', async () => {
    const list = queryMock({ data: [NEW_COMMENT] });
    anonClient = clientMock({ comments: [list] });

    const res = await GET(new NextRequest('https://site.test/api/poems/some-slug/comments'), {
      params: Promise.resolve({ slug: 'some-slug' }),
    });

    expect(await res.json()).toEqual({ comments: [NEW_COMMENT] });
    expect(list.argsOf('select')[0][0]).toBe(
      'id, parent_id, author_name, content, created_at, removed_at'
    );
    expect(list.argsOf('eq')).toEqual([['poem_id', FIXED_POEM_ID]]);
    expect(list.argsOf('order')).toEqual([['created_at', { ascending: true }]]);
  });
});
