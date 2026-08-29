'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, ConfirmDialog, DataTable, useToast } from '@/components/mds';
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
          <DataTable
            label="Comments"
            columns={[
              {
                key: 'author',
                header: 'Author',
                cell: (comment: CommentWithPoem) => (
                  <span className="text-primary">{comment.author_name}</span>
                ),
              },
              {
                key: 'content',
                header: 'Comment',
                cell: (comment: CommentWithPoem) => (
                  <span className="block max-w-md truncate">{comment.content}</span>
                ),
              },
              {
                key: 'poem',
                header: 'Poem',
                cell: (comment: CommentWithPoem) =>
                  comment.poems ? (
                    <Link
                      href={`/poem/${comment.poems.slug}`}
                      className="text-accent hover:underline"
                    >
                      {comment.poems.title}
                    </Link>
                  ) : (
                    <span className="text-tertiary">Unknown poem</span>
                  ),
              },
              {
                key: 'date',
                header: 'Date',
                cell: (comment: CommentWithPoem) =>
                  new Date(comment.created_at).toLocaleDateString(),
              },
            ]}
            rows={comments}
            rowKey={(comment) => comment.id}
            rowLabel={(comment) => `Comment by ${comment.author_name}`}
            actionsHeader="Actions"
            rowActions={(comment) => (
              <Button variant="danger" size="sm" onClick={() => handleDeleteClick(comment)}>
                Delete
              </Button>
            )}
          />
          <div className="py-3 text-sm text-tertiary">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
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
