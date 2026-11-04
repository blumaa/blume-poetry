/**
 * @jest-environment node
 *
 * Security property: the auth guard (cookie-auth client + getUser() +
 * hasAdminRole()) stays the single source of truth for who may delete a
 * comment. The actual delete must run through the service-role client, not
 * the cookie-auth client — the cookie-auth client mock below only exposes
 * `auth.getUser()` (no `.from()`), so if the route regressed to deleting
 * through it, the call would throw instead of silently no-op'ing under RLS.
 */
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/admin/comments/[id]/route';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

let currentUser: { email: string; app_metadata: { role?: string } } | null = null;

let adminClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
  }),
  createAdminClient: () => adminClient,
}));

const mockRevalidateTag = jest.fn();
jest.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

jest.mock('@/lib/config', () => ({
  getSiteUrl: () => 'https://site.test',
}));

function del(id: string) {
  return DELETE(
    new NextRequest(`https://site.test/api/admin/comments/${id}`, { method: 'DELETE', headers: { origin: 'https://site.test' } }),
    { params: Promise.resolve({ id }) }
  );
}

describe('DELETE /api/admin/comments/[id]', () => {
  beforeEach(() => {
    currentUser = null;
    mockRevalidateTag.mockClear();
    adminClient = clientMock({ comments: [queryMock({ data: [{ id: 'comment-1' }] })] });
  });

  it('rejects an unauthenticated request with 401 and never deletes', async () => {
    const res = await del('comment-1');
    expect(res.status).toBe(401);
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('rejects a logged-in non-admin with 403 and never deletes', async () => {
    currentUser = { email: 'notadmin@example.com', app_metadata: {} };
    const res = await del('comment-1');
    expect(res.status).toBe(403);
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('removes via the service-role client when the caller is the admin', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
    const query = queryMock({ data: [{ id: 'comment-1' }] });
    adminClient = clientMock({ comments: [query] });

    const res = await del('comment-1');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(query.argsOf('eq')).toEqual([['id', 'comment-1']]);
    // The poem page caches its comments; the removal must reach it at once.
    expect(mockRevalidateTag).toHaveBeenCalledWith('comments', { expire: 0 });
  });

  it('keeps the row as a scrubbed tombstone so replies keep their place', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
    const query = queryMock({ data: [{ id: 'comment-1' }] });
    adminClient = clientMock({ comments: [query] });

    await del('comment-1');

    expect(query.argsOf('delete')).toEqual([]);
    expect(query.argsOf('update')[0][0]).toEqual({
      author_name: '',
      content: '',
      removed_at: expect.any(String),
    });
    expect(query.argsOf('is')).toEqual([['removed_at', null]]);
  });

  it('answers 404 when no live comment had that id', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
    adminClient = clientMock({ comments: [queryMock({ data: [] })] });

    const res = await del('missing');

    expect(res.status).toBe(404);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('throws on a database error instead of leaking its message', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };
    adminClient = clientMock({ comments: [queryMock({ error: { message: 'secret detail' } })] });

    await expect(del('comment-1')).rejects.toThrow();
  });
});
