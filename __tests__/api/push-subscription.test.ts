/**
 * @jest-environment node
 *
 * Push subscription registration is admin-only: these endpoints store the
 * browser push credentials that later receive like notifications. A
 * non-admin must never be able to register a device.
 */
import { NextResponse } from 'next/server';

const upsert = jest.fn(async () => ({ error: null }));
const deleteEq = jest.fn(async () => ({ error: null }));
const fromMock = jest.fn(() => ({
  upsert,
  delete: () => ({ eq: deleteEq }),
}));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const requireAdmin = jest.fn(
  async (): Promise<{ user: { email: string } } | NextResponse> => ({
    user: { email: 'admin@site.test' },
  })
);

jest.mock('@/lib/auth', () => ({
  requireAdmin: () => requireAdmin(),
}));

jest.mock('@/lib/csrf', () => ({
  verifyOrigin: () => null,
}));

import { POST, DELETE } from '@/app/api/push/route';

const subscription = {
  endpoint: 'https://push.test/registration-1',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

function request(method: string, body: unknown) {
  return new Request('https://site.test/api/push', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the subscription for the admin, keyed by endpoint', async () => {
    const res = await POST(request('POST', subscription));

    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith('push_subscriptions');
    expect(upsert).toHaveBeenCalledWith(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    );
  });

  it('rejects a non-admin subscription attempt', async () => {
    requireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await POST(request('POST', subscription));

    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a malformed subscription', async () => {
    const res = await POST(request('POST', { endpoint: 'not-a-url' }));

    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('removes a subscription by endpoint', async () => {
    const res = await DELETE(request('DELETE', { endpoint: subscription.endpoint }));

    expect(res.status).toBe(200);
    expect(deleteEq).toHaveBeenCalledWith('endpoint', subscription.endpoint);
  });

  it('rejects a non-admin removal attempt', async () => {
    requireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await DELETE(request('DELETE', { endpoint: subscription.endpoint }));

    expect(res.status).toBe(401);
    expect(deleteEq).not.toHaveBeenCalled();
  });
});
