/**
 * Get or generate a persistent visitor ID for anonymous interactions (likes, comments)
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('visitor_id', id);
  }
  return id;
}
