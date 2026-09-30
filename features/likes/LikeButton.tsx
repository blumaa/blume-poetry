'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CountButton, Skeleton } from '@/components/mds';
import { queryKeys } from '@/lib/queryKeys';
import { fetchLikeState, toggleLike } from './api/likes';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
  slug: string;
}

export function LikeButton({ slug }: LikeButtonProps) {
  const queryClient = useQueryClient();
  const likeKey = queryKeys.poem.like(slug);

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
        className={styles.heartFilled}
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
