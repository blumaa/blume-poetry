/**
 * @jest-environment node
 *
 * Two properties this route must hold:
 *  - only the admin can trigger a send to the whole list
 *  - a poem's notification goes out at most once, even under double-click or
 *    retry, because email cannot be recalled
 */
import { POST } from '@/app/api/admin/notify-poem/route';

let currentUser: { email: string } | null = null;

const POEM = {
  id: '11111111-2222-4333-8444-555555555555',
  title: 'Tide',
  slug: 'tide',
  content: '<p>a line</p>',
  status: 'published',
};

// Rows the claiming UPDATE returns: one row = claimed, empty = already sent.
let claimedRows: Array<typeof POEM> = [];
let claimError: { message: string } | null = null;
let subscriberRows: Array<{ email: string; notify_new_poems: boolean }> = [];

const releaseClaim = jest.fn();
const insertLog = jest.fn(async () => ({ error: null }));
const subscriberFilters: Array<[string, unknown]> = [];

/**
 * Chainable stub. The claim ends in `.select()` and resolves to the claimed
 * rows; the release is awaited directly off the builder, which is what
 * `then` below catches.
 */
function poemsTable() {
  let values: Record<string, unknown> = {};
  const builder = {
    update: (next: Record<string, unknown>) => {
      values = next;
      return builder;
    },
    eq: () => builder,
    is: () => builder,
    select: () => Promise.resolve({ data: claimedRows, error: claimError }),
    then: (resolve: (r: unknown) => void, reject: (e: unknown) => void) => {
      releaseClaim(values);
      return Promise.resolve({ error: null }).then(resolve, reject);
    },
  };
  return builder;
}

function subscribersTable() {
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      subscriberFilters.push([column, value]);
      return builder;
    },
    then: (resolve: (r: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve({ data: subscriberRows, error: null }).then(resolve, reject),
  };
  return builder;
}

const fromMock = jest.fn((table: string) => {
  if (table === 'poems') return poemsTable();
  if (table === 'subscribers') return subscribersTable();
  return { insert: insertLog };
});

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
  }),
  createAdminClient: () => ({ from: fromMock }),
}));

jest.mock('@/lib/config', () => ({
  isAdminEmail: (email: string | undefined) => email === 'admin@site.test',
  getSiteUrl: () => 'https://site.test',
}));

const sendEmail = jest.fn(async () => ({ id: 'msg-1' }));
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...(args as [])),
  generatePoemEmailHtml: () => '<html>poem</html>',
  generatePoemEmailText: () => 'poem',
}));

function post(body: unknown) {
  return POST(
    new Request('https://site.test/api/admin/notify-poem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/admin/notify-poem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscriberFilters.length = 0;
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
    currentUser = { email: 'admin@site.test' };
    claimedRows = [POEM];
    claimError = null;
    subscriberRows = [
      { email: 'a@example.com', notify_new_poems: true },
      { email: 'b@example.com', notify_new_poems: true },
    ];
  });

  it('rejects an unauthenticated request and sends nothing', async () => {
    currentUser = null;
    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects a signed-in non-admin and sends nothing', async () => {
    currentUser = { email: 'someone@example.com' };
    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('emails every opted-in active subscriber', async () => {
    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    await expect(res.json()).resolves.toMatchObject({ sent: 2 });
  });

  it('asks the database for active, opted-in subscribers only', async () => {
    await post({ poemId: POEM.id });

    expect(subscriberFilters).toEqual(
      expect.arrayContaining([
        ['status', 'active'],
        ['notify_new_poems', true],
      ])
    );
  });

  it('sends nothing the second time, because the claim finds no unnotified row', async () => {
    await post({ poemId: POEM.id });
    sendEmail.mockClear();

    claimedRows = [];
    const res = await post({ poemId: POEM.id });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ sent: 0, alreadyNotified: true });
  });

  it('releases the claim when nobody is opted in, so the poem can still be announced later', async () => {
    subscriberRows = [];

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(releaseClaim).toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ sent: 0, recipientCount: 0 });
  });

  it('releases the claim when every send fails, so it can be retried', async () => {
    sendEmail.mockRejectedValue(new Error('smtp down'));

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(500);
    expect(releaseClaim).toHaveBeenCalled();
  });

  it('rejects a request without a poem id', async () => {
    const res = await post({});

    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
