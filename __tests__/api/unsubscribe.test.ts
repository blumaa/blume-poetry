/**
 * @jest-environment node
 *
 * /api/unsubscribe
 * - GET never unsubscribes: mail scanners follow links in delivered email, so
 *   the link opens a confirm page instead
 * - POST is the one-click unsubscribe (RFC 8058) a mail client sends from the
 *   List-Unsubscribe header, and works only with a valid signed token
 */
import { GET, POST } from '@/app/api/unsubscribe/route';
import { createUnsubscribeToken } from '@/lib/unsubscribeToken';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

let adminClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

function oneClick(url: string) {
  return POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    })
  );
}

beforeEach(() => {
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  adminClient = clientMock({ subscribers: [queryMock()] });
});

describe('GET', () => {
  it('sends the reader to the confirm page and unsubscribes no one', async () => {
    const token = createUnsubscribeToken('reader@example.com');

    const res = await GET(new Request(`https://site.test/api/unsubscribe?token=${token}`));

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`https://site.test/unsubscribe?token=${token}`);
    expect(adminClient.from).not.toHaveBeenCalled();
  });
});

describe('POST (one-click)', () => {
  it('unsubscribes the token holder', async () => {
    const query = queryMock();
    adminClient = clientMock({ subscribers: [query] });
    const token = createUnsubscribeToken('reader@example.com');

    const res = await oneClick(`https://site.test/api/unsubscribe?token=${token}`);

    expect(res.status).toBe(200);
    expect(query.argsOf('eq')).toEqual([['email', 'reader@example.com']]);
  });

  it('rejects a missing token', async () => {
    const res = await oneClick('https://site.test/api/unsubscribe');
    expect(res.status).toBe(400);
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('rejects a forged token', async () => {
    const res = await oneClick('https://site.test/api/unsubscribe?token=attacker.forged');
    expect(res.status).toBe(400);
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('does not accept a raw email in place of a token', async () => {
    const res = await oneClick('https://site.test/api/unsubscribe?email=victim@example.com');
    expect(res.status).toBe(400);
    expect(adminClient.from).not.toHaveBeenCalled();
  });
});
