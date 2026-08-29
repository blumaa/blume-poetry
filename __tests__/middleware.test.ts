/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const getClaimsMock = jest.fn(async () => ({ data: null, error: null }));
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

import { middleware } from '@/middleware';

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCookieHandlers = null;
  });

  it('refreshes the auth session before the response is returned', async () => {
    const request = new NextRequest('https://site.test/admin');
    await middleware(request);
    expect(getClaimsMock).toHaveBeenCalled();
  });

  it('reads cookies from the request', async () => {
    const request = new NextRequest('https://site.test/admin', {
      headers: { cookie: 'sb-token=abc' },
    });
    await middleware(request);
    expect(capturedCookieHandlers?.getAll()).toEqual([
      { name: 'sb-token', value: 'abc' },
    ]);
  });

  it('writes refreshed session cookies onto the response', async () => {
    const request = new NextRequest('https://site.test/admin');
    const responsePromise = middleware(request);
    capturedCookieHandlers?.setAll([{ name: 'sb-token', value: 'new' }]);
    const response = await responsePromise;
    expect(response.cookies.get('sb-token')?.value).toBe('new');
  });
});
