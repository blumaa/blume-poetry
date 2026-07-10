/**
 * @jest-environment node
 *
 * Security property: the auth guard (cookie-auth client + getUser() +
 * isAdminEmail()) stays the single source of truth for who may delete a
 * comment. The actual delete must run through the service-role client, not
 * the cookie-auth client — the cookie-auth client mock below only exposes
 * `auth.getUser()` (no `.from()`), so if the route regressed to deleting
 * through it, the call would throw instead of silently no-op'ing under RLS.
 */
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/admin/comments/[id]/route';

let currentUser: { email: string } | null = null;

const adminDeleteEq = jest.fn(async () => ({ error: null }));
const adminFromMock = jest.fn(() => ({ delete: () => ({ eq: adminDeleteEq }) }));

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
  }),
  createAdminClient: () => ({ from: adminFromMock }),
}));

jest.mock('@/lib/config', () => ({
  isAdminEmail: (email: string | undefined) => email === 'admin@site.test',
}));

function del(id: string) {
  return DELETE(
    new NextRequest(`https://site.test/api/admin/comments/${id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) }
  );
}

describe('DELETE /api/admin/comments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = null;
  });

  it('rejects an unauthenticated request with 401 and never deletes', async () => {
    const res = await del('comment-1');
    expect(res.status).toBe(401);
    expect(adminDeleteEq).not.toHaveBeenCalled();
  });

  it('rejects a logged-in non-admin with 403 and never deletes', async () => {
    currentUser = { email: 'notadmin@example.com' };
    const res = await del('comment-1');
    expect(res.status).toBe(403);
    expect(adminDeleteEq).not.toHaveBeenCalled();
  });

  it('deletes via the service-role client when the caller is the admin', async () => {
    currentUser = { email: 'admin@site.test' };
    const res = await del('comment-1');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(adminFromMock).toHaveBeenCalledWith('comments');
    expect(adminDeleteEq).toHaveBeenCalledWith('id', 'comment-1');
  });
});
