'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/mds';
import { queryKeys } from '@/lib/queryKeys';
import { fetchActivity } from './api/activity';
import { advanceInboxMarks, fetchInboxMarks } from './api/inboxMarks';
import { NO_MARKS, toInbox } from './inbox';

/* The bell sits on every admin page; a minute keeps navigation from
   refetching on each mount. A focus after that minute still refetches, so
   returning to the tab shows new likes and marks saved on another device. */
const STALE_TIME = 60_000;

/* The inbox has one source per fact: the activity query for items, the
   admin_inbox row for the cleared/seen marks, shared by every device. */
export function useInbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const activity = useQuery({
    queryKey: queryKeys.admin.activity(),
    queryFn: fetchActivity,
    staleTime: STALE_TIME,
  });
  const marks = useQuery({
    queryKey: queryKeys.admin.inboxMarks(),
    queryFn: fetchInboxMarks,
    staleTime: STALE_TIME,
  });
  // Deterministic: the inbox changes once the server answers with the saved marks.
  const advance = useMutation({
    mutationFn: advanceInboxMarks,
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.admin.inboxMarks(), saved),
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
  });

  const isPending = activity.isPending || marks.isPending;
  // Until both load, nothing counts: unknown marks would show every item as new.
  const { visible, unreadCount, newestAt } = isPending
    ? { visible: [], unreadCount: 0, newestAt: null }
    : toInbox(activity.data ?? [], marks.data ?? NO_MARKS);

  return {
    visible,
    unreadCount,
    isPending,
    isError: activity.isError || marks.isError,
    isClearing: advance.isPending && advance.variables?.clearedAt !== undefined,
    markSeen: () => {
      if (newestAt) advance.mutate({ lastSeen: newestAt });
    },
    clear: () => {
      if (newestAt) advance.mutate({ lastSeen: newestAt, clearedAt: newestAt });
    },
  };
}
