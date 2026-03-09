import { getSiteUrl } from './config';

/**
 * Verify the request origin matches the expected site URL.
 * Returns null if valid, or a Response with 403 if invalid.
 */
export function verifyOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow requests with no origin (same-origin, server-side, curl, etc.)
  if (!origin && !referer) return null;

  const siteUrl = getSiteUrl();
  const allowedOrigins = [
    siteUrl,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  if (requestOrigin && allowedOrigins.some((allowed) => requestOrigin.startsWith(allowed))) {
    return null;
  }

  return Response.json(
    { error: 'Forbidden: invalid origin' },
    { status: 403 }
  );
}
