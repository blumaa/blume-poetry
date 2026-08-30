'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button, ConfirmDialog, DataTable, useToast } from '@/components/mds';
import type { Comment } from '@/lib/supabase/types';
import styles from './page.module.css';

type CommentWithPoem = Comment & {
  poems: { title: string; slug: string } | null;
};

async function fetchAdminComments(): Promise<CommentWithPoem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*, poems(title, slug)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as CommentWithPoem[]) || [];
}

async function deleteAdminComment(id: string): Promise<void> {
  const res = await fetch(`/api/admin/comments/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Failed to delete comment' }));
    throw new Error(body.error || 'Failed to delete comment');
  }
}

export default function AdminCommentsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<CommentWithPoem | null>(null);
  const { toast } = useToast();

  const { data: comments = [], isPending } = useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: fetchAdminComments,
  });

  /* Deterministic: the row disappears only after the server confirms the
     delete and the refetch returns. */
  const deleteMutation = useMutation({
    mutationFn: (target: CommentWithPoem) => deleteAdminComment(target.id),
    onSuccess: () => toast({ title: 'Comment deleted', tone: 'success' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] }),
  });

  const handleDeleteClick = (comment: CommentWithPoem) => {
    setDeleteTarget(comment);
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Comments</h1>
      </div>

      {isPending ? (
        <div className={styles.loadingText}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className={styles.emptyState}>
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
                  <span className={styles.authorCell}>{comment.author_name}</span>
                ),
              },
              {
                key: 'content',
                header: 'Comment',
                cell: (comment: CommentWithPoem) => (
                  <span className={styles.contentCell}>{comment.content}</span>
                ),
              },
              {
                key: 'poem',
                header: 'Poem',
                cell: (comment: CommentWithPoem) =>
                  comment.poems ? (
                    <Link
                      href={`/poem/${comment.poems.slug}`}
                      className={styles.poemLink}
                    >
                      {comment.poems.title}
                    </Link>
                  ) : (
                    <span className={styles.unknownPoem}>Unknown poem</span>
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
          <div className={styles.footerCount}>
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => deleteMutation.mutateAsync(target)}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment by "${deleteTarget?.author_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}
