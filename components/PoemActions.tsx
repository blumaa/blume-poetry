'use client';

import { useRef } from 'react';
import { LikeButton } from '@/features/likes';
import { CommentSection } from '@/features/comments';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
import styles from './PoemActions.module.css';

/** The interactive part of a poem page: like, comment, and the comments. */
export function PoemActions({ slug }: { slug: string }) {
  const commentField = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      <div className={styles.row}>
        <LikeButton slug={slug} />
        <Button iconLeft={<Icon name="comment" />} onClick={() => commentField.current?.focus()}>
          add comment
        </Button>
      </div>

      <CommentSection slug={slug} fieldRef={commentField} />
    </>
  );
}
