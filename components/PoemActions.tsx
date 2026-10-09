'use client';

import { useState } from 'react';
import { LikeButton } from '@/features/likes';
import { CommentSection } from '@/features/comments';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
import styles from './PoemActions.module.css';

/** The interactive part of a poem page: like, comment, and the comments. */
export function PoemActions({ slug }: { slug: string }) {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  return (
    <>
      <div className={styles.row}>
        <LikeButton slug={slug} />
        <Button iconLeft={<Icon name="comment" />} onClick={() => setIsCommentModalOpen(true)}>
          add comment
        </Button>
      </div>

      <CommentSection
        slug={slug}
        isModalOpen={isCommentModalOpen}
        onModalClose={() => setIsCommentModalOpen(false)}
      />
    </>
  );
}
