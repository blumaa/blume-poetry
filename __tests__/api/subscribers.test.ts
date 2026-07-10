/**
 * @jest-environment node
 */
import { POST } from '@/app/api/admin/subscribers/route';

let currentUser: { email: string } | null = null;

const insertMock = jest.fn(() => ({
  select: () => ({ single: async () => ({ data: { id: '1' }, error: null }) }),
}));
const singleSelect = jest.fn(async () => ({ data: null, error: null }));
const fromMock = jest.fn(() => ({
  select: () => ({ eq: () => ({ single: singleSelect }) }),
  insert: insertMock,
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
  createAdminClient: () => ({ from: fromMock }),
}));

jest.mock('@/lib/config', () => ({
  isAdminEmail: (email: string | undefined) => email === 'admin@site.test',
}));

function post(body: unknown) {
  return POST(
    new Request('https://site.test/api/admin/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/admin/subscribers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unauthenticated request with 401 and never writes', async () => {
    currentUser = null;
    const res = await post({ email: 'new@example.com' });
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects a logged-in non-admin with 401 and never writes', async () => {
    currentUser = { email: 'notadmin@example.com' };
    const res = await post({ email: 'new@example.com' });
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('allows the admin to add a subscriber', async () => {
    currentUser = { email: 'admin@site.test' };
    const res = await post({ email: 'new@example.com' });
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalled();
  });
});
