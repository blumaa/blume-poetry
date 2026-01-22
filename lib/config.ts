/**
 * Centralized configuration for the application
 * Single source of truth for environment-based settings
 */

/**
 * Get the admin email from environment variable
 * Server-side code should use ADMIN_EMAIL, client-side uses NEXT_PUBLIC_ADMIN_EMAIL
 * Returns undefined if not configured
 */
export function getAdminEmail(): string | undefined {
  // ADMIN_EMAIL for server-side, NEXT_PUBLIC_ADMIN_EMAIL for client-side
  return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

/**
 * Check if a given email is the admin email
 * Returns false if admin email is not configured or emails don't match
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;

  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;

  return email === adminEmail;
}

/**
 * Get the site URL from environment variable
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
}
