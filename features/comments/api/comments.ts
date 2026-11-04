import { apiFetch } from '@/lib/apiFetch';
import { createClient } from '@/lib/supabase/client';
import type { Comment } from '@/lib/comments';
import type { CommentRow, PoemRow } from '@/lib/supabase/types';

export type { Comment };

export type AdminComment = CommentRow & {
  poems: Pick<PoemRow, 'title' | 'slug' | 'collection'> | null;
};

export interface PostCommentInput {
  visitorId: string;
  authorName: string;
  content: string;
  /** The comment being answered; null for a top-level comment. */
  parentId: string | null;
  /** Private; only for reply notices. Blank for none. */
  email: string;
  honeypot: string;
  timestamp: number;
}

/** A poem's comments in written order, removed ones as tombstones. */
export async function fetchComments(slug: string): Promise<Comment[]> {
  const { comments } = await apiFetch<{ comments: Comment[] }>(`/api/poems/${slug}/comments`);
  return comments;
}

/** Answers the saved comment. */
export async function postComment(slug: string, input: PostCommentInput): Promise<Comment> {
  const { comment } = await apiFetch<{ comment: Comment }>(`/api/poems/${slug}/comments`, {
    method: 'POST',
    json: input,
  });
  return comment;
}

/** Admin only; the route checks. Removes name and words, keeps replies. */
export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
}

/** Every live comment with its poem, newest first. Admin only (RLS). */
export async function fetchAdminComments(): Promise<AdminComment[]> {
  const { data } = await createClient()
    .from('comments')
    .select('*, poems(title, slug, collection)')
    .is('removed_at', null)
    .order('created_at', { ascending: false })
    .throwOnError();
  return data as AdminComment[];
}
