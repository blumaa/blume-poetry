'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './NotificationSettings.module.css';

type Preference = { enabled: boolean; unsubscribed: boolean };

type State =
  | { kind: 'loading' }
  | ({ kind: 'ready' } & Preference)
  | { kind: 'error'; message: string };

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
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [isSaving, setIsSaving] = useState(false);

  const apply = useCallback(
    async (action: 'on' | 'off') => {
      setIsSaving(true);
      try {
        const preference = await writePreference(token, action);
        setState({ kind: 'ready', ...preference });
      } catch (err) {
        setState({ kind: 'error', message: messageFor(err) });
      } finally {
        setIsSaving(false);
      }
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const preference = initialAction
          ? await writePreference(token, initialAction)
          : await readPreference(token);
        if (!cancelled) setState({ kind: 'ready', ...preference });
      } catch (err) {
        if (!cancelled) setState({ kind: 'error', message: messageFor(err) });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [initialAction, token]);

  if (state.kind === 'loading') {
    return <p className={styles.message}>One moment…</p>;
  }

  if (state.kind === 'error') {
    return (
      <>
        <h1 className={styles.title}>
          This link has expired
        </h1>
        <p className={styles.description}>{state.message}</p>
        <Link
          href="/"
          className={styles.button}
        >
          Return to poems
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>
        {state.enabled
          ? 'You’ll get an email when a new poem is published'
          : 'You won’t get emails about new poems'}
      </h1>

      {state.unsubscribed && (
        <p className={styles.notice}>
          You&rsquo;ve unsubscribed from all emails, so nothing will be sent until you subscribe
          again.
        </p>
      )}

      <p className={styles.description}>
        {state.enabled
          ? 'Changed your mind? You can turn these off any time.'
          : 'You can turn them back on whenever you like.'}
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => apply(state.enabled ? 'off' : 'on')}
          disabled={isSaving}
          className={styles.button}
        >
          {state.enabled ? 'Turn off new-poem emails' : 'Turn on new-poem emails'}
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
