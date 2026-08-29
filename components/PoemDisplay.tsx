'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Poem, PoemMeta } from '@/lib/poems';
import { LikeButton } from './LikeButton';
import { CommentSection, CommentIcon } from './CommentSection';
import { PoemContent } from './PoemContent';
import { formatDate } from '@/lib/date';
import styles from './PoemDisplay.module.css';

interface PoemDisplayProps {
  poem: Poem;
  prevPoem?: PoemMeta | null;
  nextPoem?: PoemMeta | null;
  showNavigation?: boolean;
}

export function PoemDisplay({ poem, prevPoem, nextPoem, showNavigation = true }: PoemDisplayProps) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Right goes back in time (previous), left goes forward in time (next)
      if (e.key === 'ArrowRight' && prevPoem) {
        e.preventDefault();
        router.push(`/poem/${prevPoem.slug}`);
      } else if (e.key === 'ArrowLeft' && nextPoem) {
        e.preventDefault();
        router.push(`/poem/${nextPoem.slug}`);
      }
    },
    [router, prevPoem, nextPoem, poem.slug]
  );

  // Swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only navigate if horizontal swipe is dominant and significant
      const minSwipeDistance = 50;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && nextPoem) {
          // Swipe right -> go to next (newer)
          router.push(`/poem/${nextPoem.slug}`);
        } else if (deltaX < 0 && prevPoem) {
          // Swipe left -> go to previous (older)
          router.push(`/poem/${prevPoem.slug}`);
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [router, prevPoem, nextPoem, poem.slug]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleKeyDown, handleTouchStart, handleTouchEnd]);

  return (
    <article key={poem.slug} className={`page-content ${styles.article}`}>
      {/* Navigation */}
      {showNavigation && (
        <nav className={styles.nav}>
          {nextPoem ? (
            <Link
              href={`/poem/${nextPoem.slug}`}
              className={styles.navLink}
            >
              <span className={styles.navArrowLeft}>←</span>
              <span>next poem</span>
            </Link>
          ) : (
            <span />
          )}
          {prevPoem ? (
            <Link
              href={`/poem/${prevPoem.slug}`}
              className={styles.navLinkRight}
            >
              <span>previous poem</span>
              <span className={styles.navArrowRight}>→</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {/* Title */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {poem.title}
        </h1>
        {poem.subtitle && (
          <p className={styles.subtitle}>
            {poem.subtitle}
          </p>
        )}
        <time className={styles.date}>
          {formatDate(poem.publishedAt)}
        </time>
      </header>

      {/* Poem body - uses shared PoemContent component */}
      <PoemContent html={poem.content} />

      {/* Like & Comment Buttons */}
      <div className={styles.actionsRow}>
        <LikeButton slug={poem.slug} />
        <button
          onClick={() => setIsCommentModalOpen(true)}
          className={styles.commentButton}
        >
          <CommentIcon />
          <span>add comment</span>
        </button>
      </div>

      {/* Comments */}
      <CommentSection
        slug={poem.slug}
        isModalOpen={isCommentModalOpen}
        onModalClose={() => setIsCommentModalOpen(false)}
      />
    </article>
  );
}
