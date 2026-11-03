import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchComments } from './api/comments';
import { liveCount } from './thread';

/** A poem's comments; one cache entry, shared by the thread and the count. */
export function useComments(slug: string) {
  return useQuery({
    queryKey: queryKeys.poem.comments(slug),
    queryFn: () => fetchComments(slug),
  });
}

/** Live comments on a poem, once they have loaded. */
export function useCommentCount(slug: string): number | undefined {
  const { data } = useComments(slug);
  return data === undefined ? undefined : liveCount(data);
}
