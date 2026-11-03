'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/mds';
import { SkeletonComment } from '@/components/Skeleton';
import { queryKeys } from '@/lib/queryKeys';
import { getVisitorId } from '@/lib/visitorId';
import { postComment, type Comment, type PostCommentInput } from './api/comments';
import { CommentComposer, type CommentDraft } from './CommentComposer';
import { CommentThread } from './CommentThread';
import { buildThread, liveCount } from './thread';
import { useComments } from './useComments';
import styles from './CommentSection.module.css';

interface CommentSectionProps {
  slug: string;
  className?: string;
}

/* A poem's thread and its composers. Moderation lives in /admin/comments. */
export function CommentSection({ slug, className }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: comments, isPending, isError } = useComments(slug);

  /* Deterministic: a comment appears only once the server has saved it,
     taken from the server's answer (no refetch). Written order, so it goes last. */
  const post = useMutation({
    mutationFn: (input: PostCommentInput) => postComment(slug, input),
    onSuccess: (comment) => {
      queryClient.setQueryData<Comment[]>(queryKeys.poem.comments(slug), (current) => [
        ...(current ?? []),
        comment,
      ]);
      if (comment.parent_id !== null) setReplyTo(null);
      toast({ title: comment.parent_id === null ? 'Comment posted.' : 'Reply posted.', tone: 'success' });
    },
    onError: (error) => {
      toast({
        title: error instanceof Error ? error.message : 'That comment didn’t save.',
        tone: 'danger',
      });
    },
  });

  /* False tells the composer to keep the words; onError has already said why. */
  const send = (parentId: string | null) => (draft: CommentDraft) =>
    post
      .mutateAsync({ ...draft, visitorId: getVisitorId(), parentId })
      .then(() => true)
      .catch(() => false);

  if (isPending) {
    return (
      <div className={className}>
        <SkeletonComment />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={className}>
        <p className={styles.errorText}>Failed to load comments</p>
      </div>
    );
  }

  const replyToName = comments.find(({ id }) => id === replyTo)?.author_name;

  return (
    <div className={className}>
      <CommentThread
        comments={buildThread(comments)}
        count={liveCount(comments)}
        onReply={setReplyTo}
        composer={
          <CommentComposer onSend={send(null)} sending={post.isPending} />
        }
        replyingTo={replyTo}
        replyComposer={
          replyToName !== undefined && (
            <CommentComposer
              reply={{ name: replyToName, onCancel: () => setReplyTo(null) }}
              onSend={send(replyTo)}
              sending={post.isPending}
            />
          )
        }
      />
    </div>
  );
}
