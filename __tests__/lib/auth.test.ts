/**
 * @jest-environment node
 */
let currentUser: { email: string } | null = null;

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
}));

jest.mock('@/lib/config', () => ({
  isAdminEmail: (email: string | undefined) => email === 'admin@site.test',
}));

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

describe('requireAdmin', () => {
  beforeEach(() => {
    currentUser = null;
  });

  it('returns a 401 NextResponse when there is no authenticated user', async () => {
    const result = await requireAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns a 403 NextResponse when the authenticated user is not the admin', async () => {
    currentUser = { email: 'notadmin@example.com' };
    const result = await requireAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns { user } when the authenticated user is the admin', async () => {
    currentUser = { email: 'admin@site.test' };
    const result = await requireAdmin();
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ user: { email: 'admin@site.test' } });
  });
});
