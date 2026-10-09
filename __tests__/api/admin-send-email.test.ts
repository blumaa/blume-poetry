/**
 * @jest-environment node
 *
 * /api/admin/send-email
 * - a missing poem is a 404, a database failure a 500, and neither sends
 * - a whole-list send is logged before the first mail and finished after
 */
import { POST } from '@/app/api/admin/send-email/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

let adminClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/auth', () => ({
  requireAdmin: async () => ({ user: { email: 'admin@site.test' } }),
}));

const sendEmail = jest.fn(async () => ({ id: 'msg-1' }));
const sendToSubscribers: jest.Mock = jest.fn();
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...(args as [])),
  sendToSubscribers: (...args: unknown[]) => sendToSubscribers(...args),
  generateNewsletterHtml: () => '<html>news</html>',
  generateNewsletterText: () => 'news',
}));

const POEM_ID = '11111111-2222-4333-8444-555555555555';

function post(extra: Record<string, unknown> = {}) {
  return POST(
    new Request('https://site.test/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://site.test' },
      body: JSON.stringify({ subject: 'Hi', bodyHtml: '<p>Hi</p>', bodyText: 'Hi', ...extra }),
    })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  sendToSubscribers.mockResolvedValue({ sent: 2, failed: [] });
});

afterEach(() => jest.restoreAllMocks());

describe('attached poem', () => {
  it('answers 404 when the poem does not exist', async () => {
    adminClient = clientMock({ poems: [queryMock({ data: null })] });

    const res = await post({ poemId: POEM_ID });

    expect(res.status).toBe(404);
    expect(sendToSubscribers).not.toHaveBeenCalled();
  });

  it('answers 500 when the poem cannot be read, rather than calling it missing', async () => {
    adminClient = clientMock({ poems: [queryMock({ error: { message: 'connection lost' } })] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post({ poemId: POEM_ID });

    expect(res.status).toBe(500);
    expect(sendToSubscribers).not.toHaveBeenCalled();
  });
});

describe('whole-list send', () => {
  it('sends to every active subscriber and logs the send', async () => {
    const subscribers = queryMock({ data: [{ email: 'a@example.com' }, { email: 'b@example.com' }] });
    const start = queryMock({ data: { id: 'log-1' } });
    const finish = queryMock();
    adminClient = clientMock({ subscribers: [subscribers], email_logs: [start, finish] });

    const res = await post();

    expect(res.status).toBe(200);
    expect(subscribers.argsOf('select')).toEqual([['email']]);
    expect(sendToSubscribers).toHaveBeenCalledWith(['a@example.com', 'b@example.com'], expect.any(Function));
    expect(start.argsOf('insert')).toEqual([[{ subject: 'Hi', poem_id: null, status: 'sending' }]]);
    expect(finish.argsOf('update')).toEqual([[{ status: 'sent', recipient_count: 2 }]]);
  });

  it('answers 400 and logs nothing when nobody is subscribed', async () => {
    adminClient = clientMock({ subscribers: [queryMock({ data: [] })] });

    const res = await post();

    expect(res.status).toBe(400);
    expect(adminClient.from).not.toHaveBeenCalledWith('email_logs');
  });

  it('answers 500 and logs a failed send when every mail fails', async () => {
    sendToSubscribers.mockResolvedValue({ sent: 0, failed: ['a@example.com'] });
    const finish = queryMock();
    adminClient = clientMock({
      subscribers: [queryMock({ data: [{ email: 'a@example.com' }] })],
      email_logs: [queryMock({ data: { id: 'log-1' } }), finish],
    });

    const res = await post();

    expect(res.status).toBe(500);
    expect(finish.argsOf('update')).toEqual([[{ status: 'failed', recipient_count: 0 }]]);
  });
});

describe('test email', () => {
  it('sends only to the test address and logs nothing', async () => {
    adminClient = clientMock({});

    const res = await post({ testEmail: 'me@example.com' });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'me@example.com', subject: '[TEST] Hi' })
    );
    expect(adminClient.from).not.toHaveBeenCalled();
  });
});
