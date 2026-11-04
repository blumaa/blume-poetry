import type { ReactNode } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getPoemComments } from '@/lib/comments';
import { queryKeys } from '@/lib/queryKeys';

interface CommentsBoundaryProps {
  poemId: string;
  slug: string;
  children: ReactNode;
}

/* Server component: reads a poem's comments while the page renders and hands
   them to the client cache, so the thread and its count paint with the poem.
   A failed read is left out and the client fetches it instead. */
export async function CommentsBoundary({ poemId, slug, children }: CommentsBoundaryProps) {
  const queryClient = new QueryClient();
  await queryClient
    .query({ queryKey: queryKeys.poem.comments(slug), queryFn: () => getPoemComments(poemId) })
    .catch(() => undefined);

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
