import { apiFetch } from '@/lib/apiFetch';
import { getVisitorId } from '@/lib/visitorId';

export interface ReactionCount {
  emoji: string;
  count: number;
}

/** One comment's reactions: counts, biggest first, and this visitor's own. */
export interface CommentReactions {
  counts: ReactionCount[];
  mine: string[];
}

/** Keyed by comment id. A comment with no reactions has no entry. */
export type PoemReactions = Record<string, CommentReactions>;

export interface ToggleReaction {
  commentId: string;
  emoji: string;
}

export function fetchPoemReactions(slug: string): Promise<PoemReactions> {
  return apiFetch<{ reactions: PoemReactions }>(`/api/poems/${slug}/reactions`, {
    headers: { 'x-visitor-id': getVisitorId() },
  }).then((body) => body.reactions);
}

/** Resolves with the comment's reactions after the toggle. */
export function toggleReaction(slug: string, { commentId, emoji }: ToggleReaction): Promise<CommentReactions> {
  return apiFetch<{ reactions: CommentReactions }>(`/api/poems/${slug}/reactions`, {
    method: 'POST',
    json: { visitorId: getVisitorId(), commentId, emoji },
  }).then((body) => body.reactions);
}
