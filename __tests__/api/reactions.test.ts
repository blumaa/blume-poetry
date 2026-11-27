/**
 * @jest-environment node
 *
 * /api/poems/[slug]/reactions
 * - reads and writes go through the service-role client: visitor ids stay private
 * - GET answers every reacted comment's counts and this visitor's own emoji
 * - POST toggles in one atomic call and answers the comment's new reactions
 * - only a live comment on this poem, and only a catalogue emoji, can be reacted to
 * - a new reaction notifies the admin after the response; removing one does not
 * - a database error fails the request
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/poems/[slug]/reactions/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

const POEM_ID = 'poem-123';
const COMMENT_ID = '11111111-1111-4111-8111-111111111111';
const dbError = { message: 'connection lost' };

let adminClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/poems', () => ({
  getPoemRefBySlug: async (slug: string) =>
    slug === 'missing' ? null : { id: POEM_ID, title: 'Autumn Rain', collection: 'main' },
}));

const sendReactionNotification: jest.Mock = jest.fn(async () => undefined);
jest.mock('@/lib/push', () => ({
  sendReactionNotification: (arg: unknown) => sendReactionNotification(arg),
}));

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

const paramsFor = (slug: string) => ({ params: Promise.resolve({ slug }) });

function post(body: unknown, slug = 'autumn-rain') {
  return POST(
    new NextRequest(`https://site.test/api/poems/${slug}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    paramsFor(slug)
  );
}

const validBody = { visitorId: 'visitor-1', commentId: COMMENT_ID, emoji: '🔥' };

function get(slug = 'autumn-rain') {
  return GET(
    new NextRequest(`https://site.test/api/poems/${slug}/reactions`, {
      headers: { 'x-visitor-id': 'visitor-1' },
    }),
    paramsFor(slug)
  );
}

/** A live comment by Ada, a catalogue emoji, and a toggle with `toggled`. */
function writable(toggled: { added: boolean; reactions: unknown; mine: string[] }) {
  const comment = queryMock({ data: { author_name: 'Ada' } });
  const emoji = queryMock({ data: { char: '🔥' } });
  const toggle = queryMock({ data: toggled });
  adminClient = clientMock({ comments: [comment], emoji: [emoji], toggle_comment_reaction: [toggle] });
  return { comment, emoji, toggle };
}

beforeEach(() => {
  jest.clearAllMocks();
  afterCallbacks = [];
});

describe('GET', () => {
  it("answers each reacted comment's counts and this visitor's own", async () => {
    const read = queryMock({
      data: [{ comment_id: COMMENT_ID, reactions: [{ emoji: '🔥', count: 2 }], mine: ['🔥'] }],
    });
    adminClient = clientMock({ poem_comment_reactions: [read] });

    const res = await get();

    expect(await res.json()).toEqual({
      reactions: { [COMMENT_ID]: { counts: [{ emoji: '🔥', count: 2 }], mine: ['🔥'] } },
    });
    expect(read.argsOf('rpc')).toEqual([[{ p_poem_id: POEM_ID, p_visitor_id: 'visitor-1' }]]);
  });

  it('answers 404 for an unknown poem', async () => {
    adminClient = clientMock({});
    expect((await get('missing')).status).toBe(404);
  });

  it('fails when the reactions cannot be read', async () => {
    adminClient = clientMock({ poem_comment_reactions: [queryMock({ error: dbError })] });
    await expect(get()).rejects.toThrow('connection lost');
  });
});

describe('POST', () => {
  it('toggles in one atomic call and answers the new reactions', async () => {
    const { comment, toggle } = writable({
      added: true,
      reactions: [{ emoji: '🔥', count: 1 }],
      mine: ['🔥'],
    });

    const res = await post(validBody);

    expect(await res.json()).toEqual({
      reactions: { counts: [{ emoji: '🔥', count: 1 }], mine: ['🔥'] },
    });
    expect(toggle.argsOf('rpc')).toEqual([
      [{ p_comment_id: COMMENT_ID, p_visitor_id: 'visitor-1', p_emoji: '🔥' }],
    ]);
    // Only a live comment on this poem.
    expect(comment.argsOf('eq')).toEqual([['id', COMMENT_ID], ['poem_id', POEM_ID]]);
    expect(comment.argsOf('is')).toEqual([['removed_at', null]]);
  });

  it('notifies the admin after the response, naming emoji and commenter', async () => {
    writable({ added: true, reactions: [], mine: [] });

    await post(validBody);
    expect(sendReactionNotification).not.toHaveBeenCalled();

    await runAfter();
    expect(sendReactionNotification).toHaveBeenCalledWith({
      emoji: '🔥',
      commentAuthor: 'Ada',
      poemTitle: 'Autumn Rain',
      url: '/poem/autumn-rain',
    });
  });

  it('removes without notifying', async () => {
    writable({ added: false, reactions: [], mine: [] });

    const res = await post(validBody);
    await runAfter();

    expect(await res.json()).toEqual({ reactions: { counts: [], mine: [] } });
    expect(sendReactionNotification).not.toHaveBeenCalled();
  });

  it.each([
    ['no visitor', { ...validBody, visitorId: '' }],
    ['a comment id that is not a uuid', { ...validBody, commentId: 'nope' }],
    ['no emoji', { ...validBody, emoji: '' }],
  ])('answers 400 for %s', async (_name, body) => {
    adminClient = clientMock({});
    expect((await post(body)).status).toBe(400);
  });

  it('answers 400 when the comment is removed or on another poem', async () => {
    adminClient = clientMock({
      comments: [queryMock({ data: null })],
      emoji: [queryMock({ data: { char: '🔥' } })],
    });

    const res = await post(validBody);

    expect(res.status).toBe(400);
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('answers 400 for an emoji outside the catalogue', async () => {
    adminClient = clientMock({
      comments: [queryMock({ data: { author_name: 'Ada' } })],
      emoji: [queryMock({ data: null })],
    });

    const res = await post({ ...validBody, emoji: 'x' });

    expect(res.status).toBe(400);
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown poem', async () => {
    adminClient = clientMock({});
    expect((await post(validBody, 'missing')).status).toBe(404);
  });

  it('fails and does not notify when the toggle fails', async () => {
    adminClient = clientMock({
      comments: [queryMock({ data: { author_name: 'Ada' } })],
      emoji: [queryMock({ data: { char: '🔥' } })],
      toggle_comment_reaction: [queryMock({ error: dbError })],
    });

    await expect(post(validBody)).rejects.toThrow('connection lost');
    await runAfter();
    expect(sendReactionNotification).not.toHaveBeenCalled();
  });
});
