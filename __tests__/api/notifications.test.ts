/**
 * @jest-environment node
 */
import { POST } from '@/app/api/notifications/route';
import { createEmailToken } from '@/lib/emailToken';
import { createUnsubscribeToken } from '@/lib/unsubscribeToken';

// update().eq().select().single() — `single` carries the row the update
// matched, or null when the address is no longer a subscriber.
let updatedRow: { status: string } | null = { status: 'active' };
const singleMock = jest.fn(async () => ({
  data: updatedRow,
  error: updatedRow ? null : { message: 'No rows found' },
}));
const selectMock = jest.fn(() => ({ single: singleMock }));
const eqMock = jest.fn(() => ({ select: selectMock }));
const updateMock = jest.fn(() => ({ eq: eqMock }));
const fromMock = jest.fn(() => ({ update: updateMock }));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

jest.mock('@/lib/csrf', () => ({ verifyOrigin: () => null }));
jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: () => null,
  RATE_LIMITS: { subscriptions: {} },
}));

function post(body: unknown) {
  return POST(
    new Request('https://site.test/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/notifications', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
    updatedRow = { status: 'active' };
    jest.clearAllMocks();
  });

  const token = () => createEmailToken('reader@example.com', 'notifications');

  it('turns notifications off for the token holder', async () => {
    const res = await post({ token: token(), action: 'off' });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({ notify_new_poems: false });
    expect(eqMock).toHaveBeenCalledWith('email', 'reader@example.com');
    await expect(res.json()).resolves.toMatchObject({ enabled: false });
  });

  it('turns notifications on for the token holder', async () => {
    const res = await post({ token: token(), action: 'on' });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({ notify_new_poems: true });
    await expect(res.json()).resolves.toMatchObject({ enabled: true });
  });

  it('sets rather than toggles, so a repeated request is a no-op', async () => {
    await post({ token: token(), action: 'off' });
    await post({ token: token(), action: 'off' });

    expect(updateMock).toHaveBeenNthCalledWith(1, { notify_new_poems: false });
    expect(updateMock).toHaveBeenNthCalledWith(2, { notify_new_poems: false });
  });

  it('rejects a forged token', async () => {
    const res = await post({ token: 'attacker.forged', action: 'off' });

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects an unsubscribe token used for this endpoint', async () => {
    const res = await post({ token: createUnsubscribeToken('reader@example.com'), action: 'on' });

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects a raw email in place of a token', async () => {
    const res = await post({ token: 'victim@example.com', action: 'off' });

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown action', async () => {
    const res = await post({ token: token(), action: 'toggle' });

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('says so when the address is no longer a subscriber, rather than reporting success', async () => {
    updatedRow = null;

    const res = await post({ token: token(), action: 'on' });

    expect(res.status).toBe(404);
  });

  it('tells the page when the reader has unsubscribed from everything', async () => {
    updatedRow = { status: 'unsubscribed' };

    const res = await post({ token: token(), action: 'on' });

    await expect(res.json()).resolves.toMatchObject({ enabled: true, unsubscribed: true });
  });
});
