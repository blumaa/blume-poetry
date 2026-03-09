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

  it('allows requests with no origin or referer (same-origin)', () => {
    const request = mockRequest();
    expect(verifyOrigin(request)).toBeNull();
  });

  it('blocks requests from unknown origins', () => {
    const request = mockRequest({ origin: 'https://evil-site.com' });
    const result = verifyOrigin(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('checks referer when origin is absent', () => {
    const request = mockRequest({ referer: 'https://evil-site.com/page' });
    const result = verifyOrigin(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('allows matching referer when origin is absent', () => {
    const request = mockRequest({ referer: 'https://blumenous-poetry.vercel.app/poems' });
    expect(verifyOrigin(request)).toBeNull();
  });
});
