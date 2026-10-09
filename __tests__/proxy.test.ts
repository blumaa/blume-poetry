/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

type Claims = { app_metadata?: { role?: string } } | null;
let claims: Claims = null;
const getClaimsMock = jest.fn(async () => ({ data: claims ? { claims } : null, error: null }));
let capturedCookieHandlers: {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: object }[]) => void;
} | null = null;

jest.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: NonNullable<typeof capturedCookieHandlers> }
  ) => {
    capturedCookieHandlers = opts.cookies;
    return { auth: { getClaims: getClaimsMock } };
  },
}));

import { proxy, config } from '@/proxy';

const admin: Claims = { app_metadata: { role: 'admin' } };

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCookieHandlers = null;
    claims = null;
  });

  it('refreshes the auth session before the response is returned', async () => {
    claims = admin;
    await proxy(new NextRequest('https://site.test/admin'));
    expect(getClaimsMock).toHaveBeenCalled();
  });

  it('reads cookies from the request', async () => {
    claims = admin;
    const request = new NextRequest('https://site.test/admin', {
      headers: { cookie: 'sb-token=abc' },
    });
    await proxy(request);
    expect(capturedCookieHandlers?.getAll()).toEqual([{ name: 'sb-token', value: 'abc' }]);
  });

  it('writes refreshed session cookies onto the response', async () => {
    claims = admin;
    getClaimsMock.mockImplementationOnce(async () => {
      capturedCookieHandlers?.setAll([{ name: 'sb-token', value: 'new' }]);
      return { data: { claims: admin! }, error: null };
    });
    const response = await proxy(new NextRequest('https://site.test/admin'));
    expect(response.cookies.get('sb-token')?.value).toBe('new');
  });

  it('lets the admin through to /admin pages', async () => {
    claims = admin;
    const response = await proxy(new NextRequest('https://site.test/admin/poems'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends a visitor without the admin role from /admin to /login', async () => {
    claims = { app_metadata: {} };
    const response = await proxy(new NextRequest('https://site.test/admin/poems'));
    expect(response.headers.get('location')).toBe('https://site.test/login');
  });

  it('keeps refreshed cookies on a redirect', async () => {
    getClaimsMock.mockImplementationOnce(async () => {
      capturedCookieHandlers?.setAll([{ name: 'sb-token', value: '' }]);
      return { data: null, error: null };
    });
    const response = await proxy(new NextRequest('https://site.test/admin'));
    expect(response.cookies.get('sb-token')).toBeDefined();
  });

  it('sends the signed-in admin from /login to /admin', async () => {
    claims = admin;
    const response = await proxy(new NextRequest('https://site.test/login'));
    expect(response.headers.get('location')).toBe('https://site.test/admin');
  });

  it('leaves /login alone for everyone else', async () => {
    const response = await proxy(new NextRequest('https://site.test/login'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('only runs on routes that read the session', () => {
    expect(config.matcher).toEqual(['/admin/:path*', '/login', '/api/admin/:path*', '/api/push/:path*']);
  });
});
