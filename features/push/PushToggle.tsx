'use client';

import { Button } from '@/components/mds';
import { usePushSubscription } from './usePushSubscription';

/**
 * Lets the admin turn like-notification push on or off for this browser.
 * Renders nothing where the Push API is unavailable (e.g. iOS Safari outside
 * an installed PWA).
 */
export function PushToggle() {
  const { ready, enabled, isPending, setEnabled } = usePushSubscription();
  if (!ready) return null;

  const label = enabled ? 'Disable like notifications' : 'Enable like notifications';

  return (
    <Button
      iconOnly
      variant="ghost"
      onClick={() => setEnabled(!enabled)}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={label}
      title={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={enabled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </Button>
  );
}
