'use client';

import { useEffect, useEffectEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import styles from './NotificationSettings.module.css';

type Preference = { enabled: boolean; unsubscribed: boolean };

function messageFor(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

/** Read the current preference without changing it. */
async function readPreference(token: string): Promise<Preference> {
  const res = await fetch(`/api/notifications?token=${encodeURIComponent(token)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return { enabled: data.enabled, unsubscribed: data.unsubscribed };
}

/** Set the preference to an absolute value. Repeating it changes nothing. */
async function writePreference(token: string, action: 'on' | 'off'): Promise<Preference> {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return { enabled: data.enabled, unsubscribed: data.unsubscribed };
}

interface NotificationSettingsProps {
  token: string;
  /**
   * Action named by the emailed link. Applied once on mount — a link in an
   * email gets fetched by mail scanners, so the change is made from JS with a
   * POST rather than by the page load itself.
   */
  initialAction?: 'on' | 'off';
}

export function NotificationSettings({ token, initialAction }: NotificationSettingsProps) {
  const queryClient = useQueryClient();
  const prefKey = ['notifications', token];

  /* With an initialAction the mount-time write below supplies the data, so
     the read is skipped entirely. */
  const query = useQuery({
    queryKey: prefKey,
    queryFn: () => readPreference(token),
    enabled: !initialAction,
  });

  /* Deterministic: the cache is set from the server response, never guessed. */
  const mutation = useMutation({
    mutationFn: (action: 'on' | 'off') => writePreference(token, action),
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
        <p className={styles.description}>{messageFor(error)}</p>
        <Link
          href="/"
          className={styles.button}
        >
          Return to poems
        </Link>
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
        <button
          type="button"
          onClick={() => mutation.mutate(preference.enabled ? 'off' : 'on')}
          disabled={mutation.isPending}
          className={styles.button}
        >
          {preference.enabled ? 'Turn off new-poem emails' : 'Turn on new-poem emails'}
        </button>
        <Link
          href="/"
          className={styles.buttonOutline}
        >
          Return to poems
        </Link>
      </div>
    </>
  );
}
