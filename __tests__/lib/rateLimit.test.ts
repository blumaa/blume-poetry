import { isRateLimited, getClientIp, checkRateLimit } from '@/lib/rateLimit';

// Mock Request for jsdom environment
function mockRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Request;
}

describe('isRateLimited', () => {
  const options = { limit: 3, windowMs: 1000 };

  it('allows requests under the limit', () => {
    const key = `test-${Date.now()}-under`;
    expect(isRateLimited(key, options)).toBe(false);
    expect(isRateLimited(key, options)).toBe(false);
    expect(isRateLimited(key, options)).toBe(false);
  });

  it('blocks requests over the limit', () => {
    const key = `test-${Date.now()}-over`;
    isRateLimited(key, options);
    isRateLimited(key, options);
    isRateLimited(key, options);
    expect(isRateLimited(key, options)).toBe(true);
  });

  it('resets after the window expires', async () => {
    const shortWindow = { limit: 1, windowMs: 50 };
    const key = `test-${Date.now()}-reset`;
    isRateLimited(key, shortWindow);
    expect(isRateLimited(key, shortWindow)).toBe(true);

    await new Promise((r) => setTimeout(r, 60));
    expect(isRateLimited(key, shortWindow)).toBe(false);
  });

  it('tracks different keys independently', () => {
    const key1 = `test-${Date.now()}-a`;
    const key2 = `test-${Date.now()}-b`;
    const opts = { limit: 1, windowMs: 10000 };

    isRateLimited(key1, opts);
    expect(isRateLimited(key1, opts)).toBe(true);
    expect(isRateLimited(key2, opts)).toBe(false);
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = mockRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('returns unknown when no header present', () => {
    const request = mockRequest();
    expect(getClientIp(request)).toBe('unknown');
  });
});

describe('checkRateLimit', () => {
  it('returns null when within limit', () => {
    const request = mockRequest({ 'x-forwarded-for': `check-${Date.now()}` });
    const result = checkRateLimit(request, { limit: 5, windowMs: 10000 });
    expect(result).toBeNull();
  });

  it('returns 429 response when rate limited', () => {
    const ip = `check-limited-${Date.now()}`;
    const opts = { limit: 1, windowMs: 10000 };

    checkRateLimit(mockRequest({ 'x-forwarded-for': ip }), opts);

    const result = checkRateLimit(mockRequest({ 'x-forwarded-for': ip }), opts);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });
});
