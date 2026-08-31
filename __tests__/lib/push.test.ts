/**
 * @jest-environment node
 *
 * Web-push delivery for admin notifications. Behaviors that matter:
 * - every stored subscription gets the notification payload
 * - subscriptions the push service reports as gone (404/410) are deleted
 * - a delivery failure never throws — a like must never fail because a
 *   notification could not be sent
 * - missing VAPID config is a silent no-op (local dev without keys)
 */

const sendNotification = jest.fn(async () => ({ statusCode: 201 }));
const setVapidDetails = jest.fn();

jest.mock('web-push', () => ({
  __esModule: true,
  default: { setVapidDetails, sendNotification },
}));

const subscriptionRows = [
  { id: 'sub-1', endpoint: 'https://push.test/1', p256dh: 'key1', auth: 'auth1' },
  { id: 'sub-2', endpoint: 'https://push.test/2', p256dh: 'key2', auth: 'auth2' },
];

const deleteEq = jest.fn(async () => ({ error: null }));
const fromMock = jest.fn(() => ({
  select: async () => ({ data: subscriptionRows, error: null }),
  delete: () => ({ eq: deleteEq }),
}));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { sendLikeNotification } from '@/lib/push';

describe('sendLikeNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  });

  it('sends a notification to every stored subscription', async () => {
    await sendLikeNotification({ poemTitle: 'Autumn Rain', slug: 'autumn-rain' });

    expect(fromMock).toHaveBeenCalledWith('push_subscriptions');
    expect(sendNotification).toHaveBeenCalledTimes(2);

    const [subscription, payload] = sendNotification.mock.calls[0] as unknown as [
      { endpoint: string; keys: { p256dh: string; auth: string } },
      string,
    ];
    expect(subscription).toEqual({
      endpoint: 'https://push.test/1',
      keys: { p256dh: 'key1', auth: 'auth1' },
    });

    const body = JSON.parse(payload);
    expect(body.title).toContain('Autumn Rain');
    expect(body.url).toBe('/poem/autumn-rain');
  });

  it('deletes subscriptions the push service reports as gone', async () => {
    sendNotification
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
      .mockResolvedValueOnce({ statusCode: 201 });

    await sendLikeNotification({ poemTitle: 'Autumn Rain', slug: 'autumn-rain' });

    expect(deleteEq).toHaveBeenCalledWith('id', 'sub-1');
    expect(deleteEq).toHaveBeenCalledTimes(1);
  });

  it('does not throw when delivery fails outright', async () => {
    sendNotification.mockRejectedValue(new Error('network down'));

    await expect(
      sendLikeNotification({ poemTitle: 'Autumn Rain', slug: 'autumn-rain' })
    ).resolves.toBeUndefined();
  });

  it('is a no-op without VAPID keys', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    await sendLikeNotification({ poemTitle: 'Autumn Rain', slug: 'autumn-rain' });

    expect(sendNotification).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });
});
