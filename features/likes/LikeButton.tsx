'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CountButton, Skeleton, useToast } from '@/components/mds';
import { Icon } from '@/components/icons';
import { queryKeys } from '@/lib/queryKeys';
import { fetchLikeState, toggleLike } from './api/likes';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
  slug: string;
}

export function LikeButton({ slug }: LikeButtonProps) {
  const queryClient = useQueryClient();
  const likeKey = queryKeys.poem.like(slug);
  const { toast } = useToast();

  const { data, isPending } = useQuery({
    queryKey: likeKey,
    queryFn: () => fetchLikeState(slug),
  });

  /* Deterministic: no optimistic flip. Button shows pending while the POST
     is in flight; the POST answers the new state, which replaces the cache.
     On failure the state is unknown, so refetch it. */
  const mutation = useMutation({
    mutationFn: () => toggleLike(slug),
    onSuccess: (state) => queryClient.setQueryData(likeKey, state),
    onError: (error) => {
      toast({ title: error.message, tone: 'danger' });
      return queryClient.invalidateQueries({ queryKey: likeKey });
    },
  });

  if (isPending || !data) {
    return <Skeleton variant="rect" width="5rem" height="44px" />;
  }

  return (
    <CountButton
      onClick={() => mutation.mutate()}
      icon={
        data.hasLiked ? (
          <Icon name="heart-filled" className={styles.heartFilled} />
        ) : (
          <Icon name="heart" />
        )
      }
      label={data.hasLiked ? 'Unlike this poem' : 'Like this poem'}
      active={data.hasLiked}
      loading={mutation.isPending}
    >
      {data.count}
    </CountButton>
  );
}
