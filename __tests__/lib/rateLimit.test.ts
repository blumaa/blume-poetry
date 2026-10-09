/**
 * @jest-environment node
 */
import { clientMock, queryMock } from '../supabaseMock';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

let mockClient: ReturnType<typeof clientMock>;
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}));

function mockRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://site.test/api/x', { headers });
}

describe('getClientIp', () => {
  it('prefers x-real-ip, which the platform sets and clients cannot forge', () => {
    const request = mockRequest({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.2.3.4' });
    expect(getClientIp(request)).toBe('9.9.9.9');
  });

  it('falls back to the first x-forwarded-for hop', () => {
    expect(getClientIp(mockRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('returns unknown when no header is present', () => {
    expect(getClientIp(mockRequest())).toBe('unknown');
  });
});

describe('checkRateLimit', () => {
  it('counts against a key scoped to the bucket and IP', async () => {
    const query = queryMock({ data: true });
    mockClient = clientMock({ check_rate_limit: [query] });

    await checkRateLimit(mockRequest({ 'x-real-ip': '1.2.3.4' }), RATE_LIMITS.likes);

    expect(query.argsOf('rpc')[0][0]).toEqual({
      p_key: 'likes:1.2.3.4',
      p_limit: RATE_LIMITS.likes.limit,
      p_window_seconds: RATE_LIMITS.likes.windowSeconds,
    });
  });

  it('gives each bucket its own counter', () => {
    const names = Object.values(RATE_LIMITS).map((rule) => rule.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('returns null within the limit', async () => {
    mockClient = clientMock({ check_rate_limit: [queryMock({ data: true })] });
    expect(await checkRateLimit(mockRequest(), RATE_LIMITS.comments)).toBeNull();
  });

  it('returns 429 over the limit', async () => {
    mockClient = clientMock({ check_rate_limit: [queryMock({ data: false })] });
    const result = await checkRateLimit(mockRequest(), RATE_LIMITS.comments);
    expect(result?.status).toBe(429);
  });

  it('throws when the counter cannot be read', async () => {
    mockClient = clientMock({
      check_rate_limit: [queryMock({ error: { message: 'db down' } })],
    });
    await expect(checkRateLimit(mockRequest(), RATE_LIMITS.comments)).rejects.toThrow('db down');
  });
});
