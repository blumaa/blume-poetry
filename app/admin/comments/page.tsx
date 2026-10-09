'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, DataTable, useToast } from '@/components/mds';
import { deleteComment, fetchAdminComments, type AdminComment } from '@/features/comments';
import { formatDate } from '@/lib/date';
import { invalidateKeys, queryKeys, staleAfterWrite } from '@/lib/queryKeys';
import styles from './page.module.css';

export default function AdminCommentsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const { toast } = useToast();

  const { data: comments = [], isPending, isError } = useQuery({
    queryKey: queryKeys.admin.comments(),
    queryFn: fetchAdminComments,
  });

  /* Deterministic: the row disappears only after the server confirms the
     delete and the refetch returns. */
  const deleteMutation = useMutation({
    mutationFn: (target: AdminComment) => deleteComment(target.id),
    onSuccess: () => toast({ title: 'Comment deleted', tone: 'success' }),
    onSettled: (_data, _error, target) =>
      invalidateKeys(queryClient, [
        ...staleAfterWrite.comments(),
        ...(target.poems ? [queryKeys.poem.comments(target.poems.slug)] : []),
      ]),
  });

  const handleDeleteClick = (comment: AdminComment) => {
    setDeleteTarget(comment);
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Comments</h1>
      </div>

      {isPending ? (
        <div className={styles.loadingText}>Loading comments...</div>
      ) : isError ? (
        <div className={styles.emptyState}>Failed to load comments</div>
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
                cell: (comment: AdminComment) => (
                  <span className={styles.authorCell}>{comment.author_name}</span>
                ),
              },
              {
                key: 'content',
                header: 'Comment',
                cell: (comment: AdminComment) => (
                  <span className={styles.contentCell}>{comment.content}</span>
                ),
              },
              {
                key: 'poem',
                header: 'Poem',
                cell: (comment: AdminComment) =>
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
                cell: (comment: AdminComment) => formatDate(comment.created_at),
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
