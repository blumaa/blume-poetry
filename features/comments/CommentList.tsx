'use client';

import { useQuery } from '@tanstack/react-query';
import { SkeletonComment } from '@/components/Skeleton';
import { formatDate } from '@/lib/date';
import { queryKeys } from '@/lib/queryKeys';
import { fetchComments } from './api/comments';
import styles from './CommentList.module.css';

/* A poem's comments. Moderation lives in /admin/comments. */
export function CommentList({ slug }: { slug: string }) {
  const { data: comments, isPending, isError } = useQuery({
    queryKey: queryKeys.poem.comments(slug),
    queryFn: () => fetchComments(slug),
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
    <div className={styles.commentsList}>
      {comments.map((comment) => (
        <div key={comment.id} className={styles.commentItem}>
          <div className={styles.commentHeader}>
            <div className={styles.commentMeta}>
              <span className={styles.author}>{comment.author_name}</span>
              <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
            </div>
          </div>
          <p className={styles.commentContent}>{comment.content}</p>
        </div>
      ))}
    </div>
  );
}
