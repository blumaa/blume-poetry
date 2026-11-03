'use client';

import { useState } from 'react';
import { LikeButton } from '@/features/likes';
import { CommentSection, useCommentCount } from '@/features/comments';
import { CountButton } from '@/components/mds';
import { Collapse, CollapseChevron } from '@/components/Collapse';
import { Icon } from '@/components/icons';
import styles from './PoemActions.module.css';

const commentsLabel = (count: number) => `${count} ${count === 1 ? 'comment' : 'comments'}`;

/** A poem's footer: the like, the comments toggle, and the thread it opens. */
export function PoemActions({ slug }: { slug: string }) {
  const [open, setOpen] = useState(true);
  const count = useCommentCount(slug);

  return (
    <div className={styles.footer}>
      <div role="group" aria-label="Poem actions" className={styles.row}>
        <LikeButton slug={slug} />
        <div className={styles.trailing}>
          <CountButton
            icon={<Icon name="comment" />}
            label={count === undefined ? 'Comments' : commentsLabel(count)}
            aria-expanded={open}
            onClick={() => setOpen((was) => !was)}
          >
            <span className={styles.tail}>
              {count}
              <CollapseChevron open={open} />
            </span>
          </CountButton>
        </div>
      </div>

      <Collapse open={open}>
        <CommentSection className={styles.thread} slug={slug} />
      </Collapse>
    </div>
  );
}
