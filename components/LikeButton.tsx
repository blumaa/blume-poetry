'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/Skeleton';

interface LikeButtonProps {
  slug: string;
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('visitor_id', id);
  }
  return id;
}

export function LikeButton({ slug }: LikeButtonProps) {
  const [count, setCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const visitorId = getVisitorId();

    fetch(`/api/poems/${slug}/like`, {
      headers: { 'x-visitor-id': visitorId },
    })
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count || 0);
        setHasLiked(data.hasLiked || false);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [slug]);

  const handleClick = async () => {
    if (isToggling) return;

    setIsToggling(true);
    const visitorId = getVisitorId();

    // Optimistic update
    setHasLiked(!hasLiked);
    setCount((prev) => (hasLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/poems/${slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });

      if (!res.ok) {
        // Revert on error
        setHasLiked(hasLiked);
        setCount((prev) => (hasLiked ? prev + 1 : prev - 1));
      }
    } catch {
      // Revert on error
      setHasLiked(hasLiked);
      setCount((prev) => (hasLiked ? prev + 1 : prev - 1));
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[44px] w-20 rounded" />;
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-3 border border-border rounded transition-colors min-h-[44px] text-secondary hover:border-tertiary"
      aria-label={hasLiked ? 'Unlike this poem' : 'Like this poem'}
      aria-pressed={hasLiked}
    >
      <HeartIcon filled={hasLiked} />
      <span>{count}</span>
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ color: 'var(--color-heart)' }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
