'use client';

import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
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
      loading={isPending}
      aria-label={label}
      title={label}
    >
      <Icon name={enabled ? 'heart-filled' : 'heart'} />
    </Button>
  );
}
