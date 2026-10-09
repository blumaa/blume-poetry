import { createAdminClient } from '@/lib/supabase/server';

/** A fixed-window limit. `name` scopes the counter, so buckets never share one. */
export interface RateLimit {
  name: string;
  limit: number;
  windowSeconds: number;
}

/** Vercel sets x-real-ip itself; x-forwarded-for is the fallback off-platform. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Counts this request in the shared Postgres counter
 * (supabase/migrations/20261009000300_add_rate_limits.sql).
 * Answers a 429 Response when over the limit, or null when allowed.
 */
export async function checkRateLimit(request: Request, rule: RateLimit): Promise<Response | null> {
  const { data: allowed } = await createAdminClient()
    .rpc('check_rate_limit', {
      p_key: `${rule.name}:${getClientIp(request)}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    })
    .throwOnError();

  if (allowed) return null;
  return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
}

export const RATE_LIMITS = {
  comments: { name: 'comments', limit: 10, windowSeconds: 5 * 60 },
  likes: { name: 'likes', limit: 30, windowSeconds: 60 },
  subscriptions: { name: 'subscriptions', limit: 5, windowSeconds: 60 },
  notifications: { name: 'notifications', limit: 5, windowSeconds: 60 },
  search: { name: 'search', limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, RateLimit>;
