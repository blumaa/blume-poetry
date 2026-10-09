/**
 * @jest-environment node
 */
type TestUser = { email: string; app_metadata: { role?: string } };
let currentUser: TestUser | null = null;

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
}));

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const admin: TestUser = { email: 'admin@site.test', app_metadata: { role: 'admin' } };

function request(method: string, origin?: string) {
  return new Request('http://localhost:3000/api/admin/x', {
    method,
    headers: origin ? { origin } : {},
  });
}

describe('requireAdmin', () => {
  beforeEach(() => {
    currentUser = null;
  });

  it('returns a 401 NextResponse when there is no authenticated user', async () => {
    const result = await requireAdmin(request('GET'));
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns a 403 NextResponse when the user lacks the admin role', async () => {
    currentUser = { email: 'admin@site.test', app_metadata: {} };
    const result = await requireAdmin(request('GET'));
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns { user } for a user with the admin role', async () => {
    currentUser = admin;
    const result = await requireAdmin(request('GET'));
    expect(result).toEqual({ user: admin });
  });

  it('rejects a write from a foreign origin before reading the session', async () => {
    currentUser = admin;
    const result = await requireAdmin(request('POST', 'https://evil.test'));
    expect((result as Response).status).toBe(403);
  });

  it('accepts a write from the site origin', async () => {
    currentUser = admin;
    const result = await requireAdmin(request('DELETE', 'http://localhost:3000'));
    expect(result).toEqual({ user: admin });
  });
});
