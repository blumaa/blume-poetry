/**
 * @jest-environment node
 */
import { POST } from '@/app/api/admin/subscribers/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

let currentUser: { email: string; app_metadata: { role?: string } } | null = null;
let adminClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/config', () => ({
  getSiteUrl: () => 'https://site.test',
}));

function post(body: unknown) {
  return POST(
    new Request('https://site.test/api/admin/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://site.test' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/admin/subscribers', () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    adminClient = clientMock({
      upsert_subscriber: [queryMock({ data: { outcome: 'inserted', subscriber: { id: '1' } } })],
    });
  });

  it('rejects an unauthenticated request with 401 and never writes', async () => {
    currentUser = null;
    const res = await post({ email: 'new@example.com' });
    expect(res.status).toBe(401);
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('rejects a logged-in non-admin with 403 and never writes', async () => {
    currentUser = { email: 'notadmin@example.com', app_metadata: {} };
    const res = await post({ email: 'new@example.com' });
    expect(res.status).toBe(403);
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('allows the admin to add a subscriber', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
    const res = await post({ email: 'new@example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subscriber: { id: '1' } });
  });

  it('answers 500 when the database fails', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
    adminClient = clientMock({
      upsert_subscriber: [queryMock({ error: { message: 'connection lost' } })],
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post({ email: 'new@example.com' });

    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith('Add subscriber error:', expect.any(Error));
  });
});
