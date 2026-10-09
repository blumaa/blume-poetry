'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PoemGesturesProps {
  /** Older poem: ArrowRight or swipe left. */
  prevSlug?: string;
  /** Newer poem: ArrowLeft or swipe right. */
  nextSlug?: string;
}

const MIN_SWIPE_PX = 50;

/**
 * Keyboard and swipe navigation between poems. Renders nothing; the visible
 * links stay in the server-rendered PoemDisplay.
 */
export function PoemGestures({ prevSlug, nextSlug }: PoemGesturesProps) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = (slug: string | undefined) => {
    if (!slug) return false;
    router.push(`/poem/${slug}`);
    return true;
  };

  // Effect events read the latest slugs, so the listeners attach once.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const slug = e.key === 'ArrowRight' ? prevSlug : e.key === 'ArrowLeft' ? nextSlug : undefined;
    if (go(slug)) e.preventDefault();
  });

  const onTouchStart = useEffectEvent((e: TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  const onTouchEnd = useEffectEvent((e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const deltaX = e.changedTouches[0].clientX - start.x;
    const deltaY = e.changedTouches[0].clientY - start.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) <= MIN_SWIPE_PX) return;
    go(deltaX > 0 ? nextSlug : prevSlug);
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return null;
}
