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

function allowedHosts(): string[] {
  const urls = [getSiteUrl()];
  // The deployment's own URL, so preview deployments can post to themselves.
  if (process.env.VERCEL_URL) urls.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV !== 'production') urls.push('http://localhost:3000', 'http://localhost:3001');

  return urls
    .map(hostnameOf)
    .filter((h): h is string => h !== null)
    .map(normalizeHost);
}

/**
 * Cross-site request check for routes that change state. Returns null when
 * the request comes from the site, or a 403 response.
 *
 * Browsers send Origin on every POST, PUT, PATCH and DELETE, same-origin
 * included, so a missing Origin means the request did not come from the
 * site's pages. Matching is by hostname (not string prefix) and ignores a
 * leading `www.`.
 */
export function verifyOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const host = origin ? hostnameOf(origin) : null;

  if (host && allowedHosts().includes(normalizeHost(host))) return null;

  return Response.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
}
