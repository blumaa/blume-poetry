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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "5m ago" style for recent activity; the regular date after a week. */
export function formatRelative(input: string | number | Date, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(input).getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatDate(input);
}
