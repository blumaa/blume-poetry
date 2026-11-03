'use client';

import { useState, type ReactNode } from 'react';
import { Avatar, Button, Inline, Text } from '@/components/mds';
import { Collapse, CollapseChevron } from '@/components/Collapse';
import { formatDate } from '@/lib/date';
import type { ThreadComment } from './thread';
import styles from './CommentThread.module.css';

export interface CommentThreadProps {
  comments: readonly ThreadComment[];
  /** Every live comment on the poem, replies included. */
  count?: number;
  onReply?: (id: string) => void;
  /** The field for the poem, above the comments. */
  composer?: ReactNode;
  /** The comment a reply is being written to; its field opens under it. */
  replyingTo?: string | null;
  replyComposer?: ReactNode;
  /** How deep the stepping goes before replies stack straight. */
  maxIndent?: number;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** A poem's comments, each answer under what it answers. */
export function CommentThread({
  comments,
  count,
  onReply,
  composer,
  replyingTo = null,
  replyComposer,
  maxIndent = 2,
}: CommentThreadProps) {
  const thread: Thread = { onReply, replyingTo, replyComposer, maxIndent };

  return (
    <section aria-label="Comments" className={styles.thread}>
      {count !== undefined && <Text variant="eyebrow">{plural(count, 'comment', 'comments')}</Text>}

      {composer}

      {comments.length > 0 ? (
        <ul className={styles.list}>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} depth={0} thread={thread} />
          ))}
        </ul>
      ) : (
        <Text variant="note">No comments yet.</Text>
      )}
    </section>
  );
}

type Thread = Pick<CommentThreadProps, 'onReply' | 'replyComposer'> & {
  replyingTo: string | null;
  maxIndent: number;
};

function CommentItem({
  comment,
  depth,
  thread,
}: {
  comment: ThreadComment;
  depth: number;
  thread: Thread;
}) {
  const [open, setOpen] = useState(true);
  const { id, replies } = comment;
  const hasReplies = replies !== undefined && replies.length > 0;

  const fold = hasReplies && (
    <Button
      variant="ghost"
      size="sm"
      iconLeft={<CollapseChevron open={open} from="right" />}
      aria-expanded={open}
      onClick={() => setOpen((was) => !was)}
    >
      {plural(replies.length, 'reply', 'replies')}
    </Button>
  );

  const subtree = hasReplies && (
    <Collapse open={open} className={styles.replyFold}>
      <ul className={[styles.replies, depth + 1 > thread.maxIndent && styles.flat].filter(Boolean).join(' ')}>
        {replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} thread={thread} />
        ))}
      </ul>
    </Collapse>
  );

  if (comment.removed === true) {
    return (
      <li className={styles.comment}>
        <Text variant="meta" className={styles.tombstone}>
          Comment removed
        </Text>
        {fold && <div className={styles.actions}>{fold}</div>}
        {subtree}
      </li>
    );
  }

  const { onReply } = thread;

  return (
    <li className={styles.comment}>
      <span className={styles.author}>
        <Avatar name={comment.author} size="sm" decorative />
        <span className={styles.authorText}>
          <Text variant="label" truncate>
            {comment.author}
          </Text>
          <Text variant="meta" truncate>
            {formatDate(comment.createdAt)}
          </Text>
        </span>
      </span>

      <Text className={styles.body}>{comment.body}</Text>

      <Inline gap="tight" wrap className={styles.actions}>
        {onReply !== undefined && (
          <Button variant="ghost" size="sm" onClick={() => onReply(id)}>
            Reply
          </Button>
        )}
        {fold}
      </Inline>

      {thread.replyingTo === id && thread.replyComposer}

      {subtree}
    </li>
  );
}
