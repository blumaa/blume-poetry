/**
 * Centralized configuration for the application
 * Single source of truth for environment-based settings
 */

/**
 * Get the admin email from environment variable
 * Throws an error if not configured (fail fast in production)
 */
export function getAdminEmail(): string {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error('NEXT_PUBLIC_ADMIN_EMAIL environment variable is not set');
  }

  return adminEmail;
}

/**
 * Check if a given email is the admin email
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;

  try {
    return email === getAdminEmail();
  } catch {
    // If admin email is not configured, no one is admin
    return false;
  }
}

/**
 * Get the site URL from environment variable
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
}
