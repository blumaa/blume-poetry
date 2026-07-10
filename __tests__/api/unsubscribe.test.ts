/**
 * @jest-environment node
 */
import { GET } from '@/app/api/unsubscribe/route';
import { createUnsubscribeToken } from '@/lib/unsubscribeToken';

// Capture what the DB was asked to do
const eqMock = jest.fn().mockResolvedValue({ error: null });
const updateMock = jest.fn(() => ({ eq: eqMock }));
const fromMock = jest.fn(() => ({ update: updateMock }));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

function get(url: string) {
  return GET(new Request(url));
}

describe('GET /api/unsubscribe', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
    jest.clearAllMocks();
  });

  it('unsubscribes the token holder and redirects on a valid token', async () => {
    const token = createUnsubscribeToken('reader@example.com');
    const res = await get(`https://site.test/api/unsubscribe?token=${token}`);

    expect(res.status).toBe(307); // redirect
    expect(res.headers.get('location')).toContain('/unsubscribe');
    expect(updateMock).toHaveBeenCalledWith({ status: 'unsubscribed' });
    expect(eqMock).toHaveBeenCalledWith('email', 'reader@example.com');
  });

  it('does NOT unsubscribe when the token is missing', async () => {
    const res = await get('https://site.test/api/unsubscribe');
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does NOT unsubscribe when the token is forged', async () => {
    const res = await get('https://site.test/api/unsubscribe?token=attacker.forged');
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does NOT accept a raw email in place of a token', async () => {
    const res = await get('https://site.test/api/unsubscribe?email=victim@example.com');
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
