import { verifyOrigin } from '@/lib/csrf';

// Mock Request for jsdom environment
function mockRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Request;
}

describe('verifyOrigin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SITE_URL = 'https://blumenous-poetry.vercel.app';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows requests with matching origin', () => {
    const request = mockRequest({ origin: 'https://blumenous-poetry.vercel.app' });
    expect(verifyOrigin(request)).toBeNull();
  });

  it('allows requests from localhost', () => {
    const request = mockRequest({ origin: 'http://localhost:3000' });
    expect(verifyOrigin(request)).toBeNull();
  });

  it('blocks requests with no Origin: browsers always send it on writes', () => {
    expect(verifyOrigin(mockRequest())?.status).toBe(403);
  });

  it('blocks requests from unknown origins', () => {
    const request = mockRequest({ origin: 'https://evil-site.com' });
    const result = verifyOrigin(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('does not fall back to Referer when Origin is absent', () => {
    const request = mockRequest({ referer: 'https://blumenous-poetry.vercel.app/poems' });
    expect(verifyOrigin(request)?.status).toBe(403);
  });

  it('allows localhost only outside production', () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(verifyOrigin(mockRequest({ origin: 'http://localhost:3000' }))?.status).toBe(403);
  });

  it("allows the current Vercel deployment's own host", () => {
    process.env.VERCEL_URL = 'blume-poetry-git-x.vercel.app';
    expect(verifyOrigin(mockRequest({ origin: 'https://blume-poetry-git-x.vercel.app' }))).toBeNull();
  });

  it('treats www and apex as equivalent', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://blumenouspoetry.com';

    expect(verifyOrigin(mockRequest({ origin: 'https://blumenouspoetry.com' }))).toBeNull();
    expect(verifyOrigin(mockRequest({ origin: 'https://www.blumenouspoetry.com' }))).toBeNull();
  });

  it('allows apex when the configured site is the www form', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blumenouspoetry.com';

    expect(verifyOrigin(mockRequest({ origin: 'https://blumenouspoetry.com' }))).toBeNull();
    expect(verifyOrigin(mockRequest({ origin: 'https://www.blumenouspoetry.com' }))).toBeNull();
  });

  it('blocks a look-alike host that merely prefixes the site URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://blumenouspoetry.com';

    const request = mockRequest({ origin: 'https://blumenouspoetry.com.evil.com' });
    const result = verifyOrigin(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('blocks a malformed origin', () => {
    const request = mockRequest({ origin: 'not-a-url' });
    const result = verifyOrigin(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
