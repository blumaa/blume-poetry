'use client';

import { useState, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/mds';
import { SkeletonComment } from '@/components/Skeleton';
import { queryKeys } from '@/lib/queryKeys';
import { getVisitorId } from '@/lib/visitorId';
import { fetchComments, postComment, type Comment, type PostCommentInput } from './api/comments';
import { CommentComposer, type CommentDraft } from './CommentComposer';
import { CommentThread } from './CommentThread';
import { buildThread, liveCount } from './thread';
import styles from './CommentSection.module.css';

interface CommentSectionProps {
  slug: string;
  /** The poem's comment field, for a button elsewhere to focus. */
  fieldRef?: RefObject<HTMLTextAreaElement | null>;
}

/* A poem's thread and its composers. Moderation lives in /admin/comments. */
export function CommentSection({ slug, fieldRef }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: comments, isPending, isError } = useQuery({
    queryKey: queryKeys.poem.comments(slug),
    queryFn: () => fetchComments(slug),
  });

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
      <div className={styles.section}>
        <SkeletonComment />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.section}>
        <p className={styles.errorText}>Failed to load comments</p>
      </div>
    );
  }

  const replyToName = comments.find(({ id }) => id === replyTo)?.author_name;

  return (
    <div className={styles.section}>
      <CommentThread
        comments={buildThread(comments)}
        count={liveCount(comments)}
        onReply={setReplyTo}
        composer={
          <CommentComposer
            onSend={send(null)}
            sending={post.isPending}
            {...(fieldRef === undefined ? {} : { fieldRef })}
          />
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
