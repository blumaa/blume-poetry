'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/mds';
import { queryKeys } from '@/lib/queryKeys';
import { isPushSupported, isSubscribed, subscribe, unsubscribe } from './api/pushSubscription';

/* Deterministic: the toggle moves only once the browser confirms the write.
   subscribe() and unsubscribe() resolve to the state they left, which is
   written to the cache with no second round trip; a failure re-reads what
   the browser reports. Every mounted reader shares the one query. */
export function usePushSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supported = isPushSupported();

  const { data: enabled, isSuccess } = useQuery({
    queryKey: queryKeys.push.subscription(),
    queryFn: isSubscribed,
    enabled: supported,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.push.subscription() });

  const toggle = useMutation({
    mutationFn: (next: boolean) => (next ? subscribe() : unsubscribe()),
    onSuccess: (enabled) => queryClient.setQueryData(queryKeys.push.subscription(), enabled),
    onError: (err, next) => {
      console.error(`${next ? 'Enabling' : 'Disabling'} push failed:`, err);
      toast({
        title: `Couldn't ${next ? 'enable' : 'disable'} like notifications`,
        tone: 'danger',
      });
      return refresh();
    },
  });

  return {
    /* Unsupported, still detecting, and failed detection all render nothing. */
    ready: supported && isSuccess,
    enabled: enabled ?? false,
    isPending: toggle.isPending,
    setEnabled: toggle.mutate,
  };
}
