import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/mds';
import { queryKeys } from '@/lib/queryKeys';
import { fetchEmojiCatalogue } from './api/emoji';
import { fetchPoemReactions, toggleReaction, type PoemReactions, type ToggleReaction } from './api/reactions';

/** Every reacted comment on a poem, with this visitor's own. */
export function usePoemReactions(slug: string) {
  return useQuery({
    queryKey: queryKeys.poem.reactions(slug),
    queryFn: () => fetchPoemReactions(slug),
  });
}

/* Deterministic: no optimistic count. The POST answers the comment's new
   reactions, which replace that entry. On failure the state is unknown, so
   refetch it. */
export function useToggleReaction(slug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const key = queryKeys.poem.reactions(slug);

  return useMutation({
    mutationFn: (input: ToggleReaction) => toggleReaction(slug, input),
    onSuccess: (reactions, { commentId }) =>
      queryClient.setQueryData<PoemReactions>(key, (current) => ({ ...current, [commentId]: reactions })),
    onError: (error) => {
      toast({ title: error.message, tone: 'danger' });
      return queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** The whole catalogue, fetched the first time a picker opens, then kept. */
export function useEmojiCatalogue(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.emoji.catalogue(),
    queryFn: fetchEmojiCatalogue,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
