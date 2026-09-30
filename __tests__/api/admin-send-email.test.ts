/**
 * @jest-environment node
 *
 * The attached-poem lookup: a missing poem is a 404, a database failure is a
 * 500, and neither sends anything.
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
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...(args as [])),
  generateNewsletterHtml: () => '<html>news</html>',
  generateNewsletterText: () => 'news',
}));

const POEM_ID = '11111111-2222-4333-8444-555555555555';

function post() {
  return POST(
    new Request('https://site.test/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Hi', bodyHtml: '<p>Hi</p>', bodyText: 'Hi', poemId: POEM_ID }),
    })
  );
}

afterEach(() => jest.restoreAllMocks());

describe('POST /api/admin/send-email — attached poem', () => {
  beforeEach(() => sendEmail.mockClear());

  it('answers 404 when the poem does not exist', async () => {
    adminClient = clientMock({ poems: [queryMock({ data: null })] });

    const res = await post();

    expect(res.status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('answers 500 when the poem cannot be read, rather than calling it missing', async () => {
    adminClient = clientMock({ poems: [queryMock({ error: { message: 'connection lost' } })] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post();

    expect(res.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
