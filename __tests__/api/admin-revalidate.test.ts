/**
 * @jest-environment node
 */
import { POST } from '@/app/api/admin/revalidate/route';
import { revalidateTag } from 'next/cache';

let isAdmin = true;

jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

jest.mock('@/lib/auth', () => ({
  requireAdmin: async () =>
    isAdmin ? { user: { email: 'admin@site.test' } } : new Response(null, { status: 403 }),
}));

function post() {
  return POST(new Request('https://site.test/api/admin/revalidate', { method: 'POST' }));
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/admin/revalidate', () => {
  it('expires the cached poem reads at once', async () => {
    isAdmin = true;
    const res = await post();

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('poems', { expire: 0 });
  });

  it('refuses anyone but the admin', async () => {
    isAdmin = false;
    const res = await post();

    expect(res.status).toBe(403);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
