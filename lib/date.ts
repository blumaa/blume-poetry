/**
 * Single source of truth for user-facing date formatting.
 * Renders DD/MM/YYYY (e.g. 30/07/2026) in the Europe/Berlin time zone.
 */
const DATE_LOCALE = 'en-GB';
const TIME_ZONE = 'Europe/Berlin';

export function formatDate(input: string | number | Date): string {
  return new Date(input).toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

export function formatDateTime(input: string | number | Date): string {
  return new Date(input).toLocaleString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
}
