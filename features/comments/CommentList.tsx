'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, useToast } from '@/components/mds';
import { SkeletonComment } from '@/components/Skeleton';
import { useAuth } from '@/features/auth';
import { formatDate } from '@/lib/date';
import { queryKeys } from '@/lib/queryKeys';
import { deleteComment, fetchComments, type Comment } from './api/comments';
import styles from './CommentList.module.css';

/* A poem's comments. The admin gets a delete action per comment. */
export function CommentList({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const commentsKey = queryKeys.poem.comments(slug);

  const { data: comments, isPending, isError } = useQuery({
    queryKey: commentsKey,
    queryFn: () => fetchComments(slug),
  });

  /* Deterministic: the comment disappears only after the server confirms
     the delete and the refetch returns. */
  const deleteMutation = useMutation({
    mutationFn: (target: Comment) => deleteComment(target.id),
    onSuccess: () => toast({ title: 'Comment deleted', tone: 'success' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: commentsKey }),
  });

  if (isPending) {
    return (
      <div className={styles.divider}>
        <SkeletonComment />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.divider}>
        <p className={styles.errorText}>Failed to load comments</p>
      </div>
    );
  }

  if (comments.length === 0) return null;

  return (
    <>
      <div className={styles.commentsList}>
        {comments.map((comment) => (
          <div key={comment.id} className={styles.commentItem}>
            <div className={styles.commentHeader}>
              <div className={styles.commentMeta}>
                <span className={styles.author}>{comment.author_name}</span>
                <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
              </div>
              {isAdmin && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(comment)}
                  aria-label="Delete comment"
                >
                  Delete
                </Button>
              )}
            </div>
            <p className={styles.commentContent}>{comment.content}</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => deleteMutation.mutateAsync(target)}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment by "${deleteTarget?.author_name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </>
  );
}
