import { apiFetch } from '@/lib/apiFetch';
import { createClient } from '@/lib/supabase/client';
import type { CommentRow } from '@/lib/supabase/types';

export type Comment = Pick<CommentRow, 'id' | 'author_name' | 'content' | 'created_at'>;

export type AdminComment = CommentRow & {
  poems: { title: string; slug: string } | null;
};

export interface PostCommentInput {
  visitorId: string;
  authorName: string;
  content: string;
  honeypot: string;
  timestamp: number;
}

export async function fetchComments(slug: string): Promise<Comment[]> {
  const { comments } = await apiFetch<{ comments: Comment[] }>(`/api/poems/${slug}/comments`);
  return comments;
}

export async function postComment(slug: string, input: PostCommentInput): Promise<void> {
  await apiFetch(`/api/poems/${slug}/comments`, { method: 'POST', json: input });
}

/** Admin only; the route checks. */
export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
}

/** Every comment with its poem, newest first. Admin only (RLS). */
export async function fetchAdminComments(): Promise<AdminComment[]> {
  const { data } = await createClient()
    .from('comments')
    .select('*, poems(title, slug)')
    .order('created_at', { ascending: false })
    .throwOnError();
  return data as AdminComment[];
}
