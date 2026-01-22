'use client';

import { useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Poem } from '@/lib/poems';
import { LikeButton } from './LikeButton';
import { CommentSection } from './CommentSection';
import { PoemContent } from './PoemContent';

interface PoemDisplayProps {
  poem: Poem;
  prevPoem?: Poem | null;
  nextPoem?: Poem | null;
  showNavigation?: boolean;
}

export function PoemDisplay({ poem, prevPoem, nextPoem, showNavigation = true }: PoemDisplayProps) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' && nextPoem) {
        e.preventDefault();
        router.push(`/poem/${nextPoem.slug}`);
      } else if (e.key === 'ArrowLeft' && prevPoem) {
        e.preventDefault();
        router.push(`/poem/${prevPoem.slug}`);
      }
    },
    [router, prevPoem, nextPoem]
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
        if (deltaX > 0 && prevPoem) {
          // Swipe right -> go to previous (newer)
          router.push(`/poem/${prevPoem.slug}`);
        } else if (deltaX < 0 && nextPoem) {
          // Swipe left -> go to next (older)
          router.push(`/poem/${nextPoem.slug}`);
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [router, prevPoem, nextPoem]
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
    <article key={poem.slug} className="page-content max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12 overflow-x-hidden">
      {/* Title */}
      <header className="mb-8">
        <h1 className="text-xl md:text-2xl font-normal text-primary leading-tight">
          {poem.title}
        </h1>
        {poem.subtitle && (
          <p className="text-base md:text-lg text-secondary mt-1 italic">
            {poem.subtitle}
          </p>
        )}
        <time className="text-sm text-tertiary mt-2 block">
          {new Date(poem.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      </header>

      {/* Poem body - uses shared PoemContent component */}
      <PoemContent html={poem.content} />

      {/* Like Button */}
      <div className="mt-8">
        <LikeButton slug={poem.slug} />
      </div>

      {/* Navigation */}
      {showNavigation && (
        <footer className="mt-8 md:mt-12 pt-8 border-t border-border flex justify-between text-sm gap-4">
          {prevPoem ? (
            <Link
              href={`/poem/${prevPoem.slug}`}
              className="text-secondary hover:text-primary transition-colors min-h-[44px] flex items-center"
            >
              <span className="text-tertiary mr-1">←</span>
              <span className="truncate max-w-[120px] md:max-w-none">
                {prevPoem.title.slice(0, 30)}
                {prevPoem.title.length > 30 ? '...' : ''}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {nextPoem ? (
            <Link
              href={`/poem/${nextPoem.slug}`}
              className="text-secondary hover:text-primary transition-colors text-right min-h-[44px] flex items-center"
            >
              <span className="truncate max-w-[120px] md:max-w-none">
                {nextPoem.title.slice(0, 30)}
                {nextPoem.title.length > 30 ? '...' : ''}
              </span>
              <span className="text-tertiary ml-1">→</span>
            </Link>
          ) : (
            <span />
          )}
        </footer>
      )}

      {/* Comments */}
      <CommentSection slug={poem.slug} />
    </article>
  );
}
