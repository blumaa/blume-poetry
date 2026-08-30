'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CountButton, Skeleton } from '@/components/mds';
import { getVisitorId } from '@/lib/visitorId';

interface LikeButtonProps {
  slug: string;
}

interface LikeState {
  count: number;
  hasLiked: boolean;
}

async function fetchLikeState(slug: string): Promise<LikeState> {
  const res = await fetch(`/api/poems/${slug}/like`, {
    headers: { 'x-visitor-id': getVisitorId() },
  });
  if (!res.ok) throw new Error('Failed to load likes');
  const data = await res.json();
  return { count: data.count || 0, hasLiked: data.hasLiked || false };
}

async function toggleLike(slug: string): Promise<void> {
  const res = await fetch(`/api/poems/${slug}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: getVisitorId() }),
  });
  if (!res.ok) throw new Error('Failed to toggle like');
}

export function LikeButton({ slug }: LikeButtonProps) {
  const queryClient = useQueryClient();
  const likeKey = ['poems', slug, 'like'];

  const { data, isPending } = useQuery({
    queryKey: likeKey,
    queryFn: () => fetchLikeState(slug),
  });

  /* Deterministic: no optimistic flip. Button shows pending while the POST
     is in flight; the count changes only after the server-confirmed refetch. */
  const mutation = useMutation({
    mutationFn: () => toggleLike(slug),
    onSettled: () => queryClient.invalidateQueries({ queryKey: likeKey }),
  });

  if (isPending || !data) {
    return <Skeleton variant="rect" width="5rem" height="44px" />;
  }

  return (
    <CountButton
      onClick={() => mutation.mutate()}
      icon={<HeartIcon filled={data.hasLiked} />}
      label={data.hasLiked ? 'Unlike this poem' : 'Like this poem'}
      active={data.hasLiked}
      loading={mutation.isPending}
    >
      {data.count}
    </CountButton>
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
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
