/**
 * @jest-environment node
 *
 * Two properties this route must hold:
 *  - only the admin can trigger a send to the whole list
 *  - a poem's notification goes out at most once, even under double-click or
 *    retry, because email cannot be recalled
 */
import { POST } from '@/app/api/admin/notify-poem/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

let currentUser: { email: string; app_metadata: { role?: string } } | null = null;
let adminClient: ReturnType<typeof clientMock>;

const POEM = {
  id: '11111111-2222-4333-8444-555555555555',
  title: 'Tide',
  slug: 'tide',
  content: '<p>a line</p>',
  plain_text: 'a line',
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
  }),
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/config', () => ({
  getSiteUrl: () => 'https://site.test',
}));

const sendToSubscribers: jest.Mock = jest.fn();
jest.mock('@/lib/email', () => ({
  sendToSubscribers: (...args: unknown[]) => sendToSubscribers(...args),
  generatePoemEmailHtml: () => '<html>poem</html>',
  generatePoemEmailText: () => 'poem',
}));

function post(body: unknown) {
  return POST(
    new Request('https://site.test/api/admin/notify-poem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://site.test' },
      body: JSON.stringify(body),
    })
  );
}

const subscriberRows = [{ email: 'a@example.com' }, { email: 'b@example.com' }];

/** Claim succeeds, two subscribers, log start and finish, plus a spare poems
    query for a release. */
function happyClient(overrides: Partial<Record<string, ReturnType<typeof queryMock>[]>> = {}) {
  return clientMock({
    poems: [queryMock({ data: [POEM] }), queryMock()],
    subscribers: [queryMock({ data: subscriberRows })],
    email_logs: [queryMock({ data: { id: 'log-1' } }), queryMock()],
    ...overrides,
  });
}

function released() {
  return adminClient.from.mock.calls.filter(([table]) => table === 'poems').length === 2;
}

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
  sendToSubscribers.mockResolvedValue({ sent: 2, failed: [] });
  adminClient = happyClient();
});

afterEach(() => jest.restoreAllMocks());

describe('POST /api/admin/notify-poem', () => {
  it('rejects an unauthenticated request and sends nothing', async () => {
    currentUser = null;
    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(401);
    expect(sendToSubscribers).not.toHaveBeenCalled();
  });

  it('rejects a signed-in non-admin and sends nothing', async () => {
    currentUser = { email: 'someone@example.com', app_metadata: {} };
    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(403);
    expect(sendToSubscribers).not.toHaveBeenCalled();
  });

  it('emails every active, opted-in subscriber and logs the send', async () => {
    const subscribers = queryMock({ data: subscriberRows });
    const finish = queryMock();
    adminClient = happyClient({
      subscribers: [subscribers],
      email_logs: [queryMock({ data: { id: 'log-1' } }), finish],
    });

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ sent: 2 });
    expect(subscribers.argsOf('eq')).toEqual([
      ['status', 'active'],
      ['notify_new_poems', true],
    ]);
    expect(sendToSubscribers).toHaveBeenCalledWith(['a@example.com', 'b@example.com'], expect.any(Function));
    expect(finish.argsOf('update')).toEqual([[{ status: 'sent', recipient_count: 2 }]]);
    expect(released()).toBe(false);
  });

  it('sends nothing when the claim finds no unnotified row', async () => {
    adminClient = clientMock({ poems: [queryMock({ data: [] })] });

    const res = await post({ poemId: POEM.id });

    expect(sendToSubscribers).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ sent: 0, alreadyNotified: true });
  });

  it('releases the claim when nobody is opted in, so the poem can still be announced later', async () => {
    adminClient = happyClient({ subscribers: [queryMock({ data: [] })] });

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(200);
    expect(sendToSubscribers).not.toHaveBeenCalled();
    expect(released()).toBe(true);
    await expect(res.json()).resolves.toMatchObject({ sent: 0, recipientCount: 0 });
  });

  it('releases the claim when the subscribers cannot be read', async () => {
    adminClient = happyClient({ subscribers: [queryMock({ error: { message: 'connection lost' } })] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(500);
    expect(sendToSubscribers).not.toHaveBeenCalled();
    expect(released()).toBe(true);
  });

  it('releases the claim when every send fails, so it can be retried', async () => {
    sendToSubscribers.mockResolvedValue({ sent: 0, failed: ['a@example.com', 'b@example.com'] });

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(500);
    expect(released()).toBe(true);
  });

  it('keeps the claim after a partial send, since some mail went out', async () => {
    sendToSubscribers.mockResolvedValue({ sent: 1, failed: ['b@example.com'] });

    const res = await post({ poemId: POEM.id });

    expect(res.status).toBe(200);
    expect(released()).toBe(false);
  });

  it('rejects a request without a poem id', async () => {
    const res = await post({});

    expect(res.status).toBe(400);
    expect(sendToSubscribers).not.toHaveBeenCalled();
  });
});
