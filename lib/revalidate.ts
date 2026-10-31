import { apiFetch } from './apiFetch';
import type { CacheScope } from './cacheTags';

/** Busts one scope of cached public reads so the site shows an admin write. */
export async function revalidateCache(scope: CacheScope): Promise<void> {
  await apiFetch('/api/admin/revalidate', { method: 'POST', json: { scope } });
}
