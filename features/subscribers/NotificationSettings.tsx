'use client';

import { useEffect, useEffectEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, ButtonLink } from '@/components/mds';
import { queryKeys } from '@/lib/queryKeys';
import { readPreference, writePreference, type PreferenceAction } from './api/preferences';
import styles from './NotificationSettings.module.css';

interface NotificationSettingsProps {
  token: string;
  /**
   * Action named by the emailed link. Applied once on mount — a link in an
   * email gets fetched by mail scanners, so the change is made from JS with a
   * POST rather than by the page load itself.
   */
  initialAction?: PreferenceAction;
}

export function NotificationSettings({ token, initialAction }: NotificationSettingsProps) {
  const queryClient = useQueryClient();
  const prefKey = queryKeys.subscriber.preference(token);

  /* With an initialAction the mount-time write below supplies the data, so
     the read is skipped entirely. */
  const query = useQuery({
    queryKey: prefKey,
    queryFn: () => readPreference(token),
    enabled: !initialAction,
  });

  /* Deterministic: the cache is set from the server response, never guessed. */
  const mutation = useMutation({
    mutationFn: (action: PreferenceAction) => writePreference(token, action),
    onSuccess: (preference) => queryClient.setQueryData(prefKey, preference),
  });

  const applyInitialAction = useEffectEvent(() => {
    if (initialAction) mutation.mutate(initialAction);
  });

  useEffect(() => {
    applyInitialAction();
  }, []);

  const preference = query.data;
  const error = mutation.error ?? query.error;

  if (error) {
    return (
      <>
        <h1 className={styles.title}>
          This link has expired
        </h1>
        <p className={styles.description}>{error.message}</p>
        <ButtonLink href="/">
          Return to poems
        </ButtonLink>
      </>
    );
  }

  if (!preference) {
    return <p className={styles.message}>One moment…</p>;
  }

  return (
    <>
      <h1 className={styles.title}>
        {preference.enabled
          ? 'You’ll get an email when a new poem is published'
          : 'You won’t get emails about new poems'}
      </h1>

      {preference.unsubscribed && (
        <p className={styles.notice}>
          You&rsquo;ve unsubscribed from all emails, so nothing will be sent until you subscribe
          again.
        </p>
      )}

      <p className={styles.description}>
        {preference.enabled
          ? 'Changed your mind? You can turn these off any time.'
          : 'You can turn them back on whenever you like.'}
      </p>

      <div className={styles.actions}>
        <Button
          onClick={() => mutation.mutate(preference.enabled ? 'off' : 'on')}
          loading={mutation.isPending}
        >
          {preference.enabled ? 'Turn off new-poem emails' : 'Turn on new-poem emails'}
        </Button>
        <ButtonLink href="/" variant="secondary">
          Return to poems
        </ButtonLink>
      </div>
    </>
  );
}
