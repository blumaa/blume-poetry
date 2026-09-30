import { readStored, writeStored } from './browserStorage';

/**
 * Get or generate a persistent visitor ID for anonymous interactions (likes, comments)
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  const stored = readStored('visitorId');
  if (stored) return stored;

  const id = crypto.randomUUID();
  writeStored('visitorId', id);
  return id;
}
