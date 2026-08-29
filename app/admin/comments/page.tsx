'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog, useToast } from '@/components/mds';
import type { Comment } from '@/lib/supabase/types';

type CommentWithPoem = Comment & {
  poems: { title: string; slug: string } | null;
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentWithPoem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CommentWithPoem | null>(null);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('comments')
      .select('*, poems(title, slug)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments((data as CommentWithPoem[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDeleteClick = (comment: CommentWithPoem) => {
    setDeleteTarget(comment);
  };

  const handleDeleteConfirm = async (target: CommentWithPoem) => {
    const res = await fetch(`/api/admin/comments/${target.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to delete comment' }));
      throw new Error(body.error || 'Failed to delete comment');
    }

    setComments((current) => current.filter((c) => c.id !== target.id));
    toast({ title: 'Comment deleted', tone: 'success' });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl text-primary">Comments</h1>
      </div>

      {isLoading ? (
        <div className="text-tertiary">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          No comments found.
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-surface rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-primary font-medium text-sm truncate">{comment.author_name}</span>
                  <span className="text-xs text-tertiary flex-shrink-0">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-secondary mb-3">{comment.content}</p>
                <div className="flex items-center justify-between gap-2">
                  {comment.poems ? (
                    <Link
                      href={`/poem/${comment.poems.slug}`}
                      className="text-sm text-accent hover:underline truncate"
                    >
                      {comment.poems.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-tertiary">Unknown poem</span>
                  )}
                  <button
                    onClick={() => handleDeleteClick(comment)}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <div className="py-3 text-sm text-tertiary text-center">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-primary">Author</th>
                  <th className="text-left p-4 font-medium text-primary">Comment</th>
                  <th className="text-left p-4 font-medium text-primary">Poem</th>
                  <th className="text-left p-4 font-medium text-primary">Date</th>
                  <th className="text-right p-4 font-medium text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id} className="border-t border-border">
                    <td className="p-4 text-primary">{comment.author_name}</td>
                    <td className="p-4 text-secondary max-w-md truncate">{comment.content}</td>
                    <td className="p-4">
                      {comment.poems ? (
                        <Link
                          href={`/poem/${comment.poems.slug}`}
                          className="text-accent hover:underline"
                        >
                          {comment.poems.title}
                        </Link>
                      ) : (
                        <span className="text-tertiary">Unknown poem</span>
                      )}
                    </td>
                    <td className="p-4 text-tertiary">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteClick(comment)}
                        className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-surface-secondary border-t border-border text-sm text-tertiary">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment by "${deleteTarget?.author_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}
