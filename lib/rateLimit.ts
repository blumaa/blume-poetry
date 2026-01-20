/**
 * Simple in-memory rate limiting
 * Note: This resets on server restart. For production, consider using Redis/Upstash.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Store rate limit records by key (usually IP address)
const rateLimitMap = new Map<string, RateLimitRecord>();

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Check if a key (usually IP address) is rate limited
 * Returns true if rate limited, false if allowed
 */
export function isRateLimited(key: string, options: RateLimitOptions): boolean {
  const { limit, windowMs } = options;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

/**
 * Get the client IP address from a request
 */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  /** Comments: 10 per 5 minutes */
  comments: { limit: 10, windowMs: 5 * 60 * 1000 },
  /** Likes: 30 per minute */
  likes: { limit: 30, windowMs: 60 * 1000 },
  /** Subscriptions: 5 per minute */
  subscriptions: { limit: 5, windowMs: 60 * 1000 },
} as const;
