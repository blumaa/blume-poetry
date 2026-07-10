import { getSiteUrl } from './config';

/**
 * Strip a leading `www.` so apex and www hosts are treated as equal.
 */
function normalizeHost(host: string): string {
  return host.replace(/^www\./, '');
}

/**
 * Extract the hostname from a URL string, or null if it can't be parsed.
 */
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Verify the request origin matches the expected site URL.
 * Returns null if valid, or a Response with 403 if invalid.
 *
 * Matching is by hostname (not string prefix) and ignores a leading `www.`,
 * so both the apex and www forms of the configured site are accepted.
 */
export function verifyOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow requests with no origin (same-origin, server-side, curl, etc.)
  if (!origin && !referer) return null;

  const forbidden = Response.json(
    { error: 'Forbidden: invalid origin' },
    { status: 403 }
  );

  const requestHost = hostnameOf(origin || referer!);
  if (!requestHost) return forbidden;

  const allowedHosts = [
    getSiteUrl(),
    'http://localhost:3000',
    'http://localhost:3001',
  ]
    .map(hostnameOf)
    .filter((h): h is string => h !== null)
    .map(normalizeHost);

  if (allowedHosts.includes(normalizeHost(requestHost))) {
    return null;
  }

  return forbidden;
}
