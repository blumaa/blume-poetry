'use client';

import { useQuery } from '@tanstack/react-query';
import { writeStored } from '@/lib/browserStorage';
import { useStored } from '@/lib/useStored';
import { queryKeys } from '@/lib/queryKeys';
import { fetchActivity } from './api/activity';
import { toInbox } from './inbox';

/* The inbox has one source per fact: the activity query for items, storage
   for the cleared/seen marks. Every mounted reader derives the same inbox. */
export function useInbox() {
  const { data = [], isPending, isError } = useQuery({
    queryKey: queryKeys.admin.activity(),
    queryFn: fetchActivity,
  });
  const clearedAt = useStored('notificationsCleared');
  const lastSeen = useStored('notificationsLastSeen');

  return {
    ...toInbox(data, { clearedAt, lastSeen }),
    isPending,
    isError,
    markSeen: () => writeStored('notificationsLastSeen', new Date().toISOString()),
    clear: () => writeStored('notificationsCleared', new Date().toISOString()),
  };
}
