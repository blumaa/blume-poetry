import { apiFetch } from '@/lib/apiFetch';
import { getVisitorId } from '@/lib/visitorId';

export interface LikeState {
  count: number;
  hasLiked: boolean;
}

export function fetchLikeState(slug: string): Promise<LikeState> {
  return apiFetch<LikeState>(`/api/poems/${slug}/like`, {
    headers: { 'x-visitor-id': getVisitorId() },
  });
}

export async function toggleLike(slug: string): Promise<void> {
  await apiFetch(`/api/poems/${slug}/like`, {
    method: 'POST',
    json: { visitorId: getVisitorId() },
  });
}
