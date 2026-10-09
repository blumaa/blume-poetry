/**
 * Centralized configuration for the application
 * Single source of truth for environment-based settings
 */

/**
 * Get the site URL from environment variable
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
}
