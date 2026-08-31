'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/mds';

type PushState = 'loading' | 'off' | 'on' | 'busy';

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!navigator.serviceWorker &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Web push wants the VAPID public key as raw bytes, not base64url. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

/**
 * Lets the admin turn like-notification push on or off for this browser.
 * Renders nothing where the Push API is unavailable (e.g. iOS Safari outside
 * an installed PWA).
 */
export function PushToggle() {
  // 'loading' renders nothing, so an unsupported browser and a still-detecting
  // one produce identical output — no setState needed for the unsupported case.
  const [state, setState] = useState<PushState>('loading');

  useEffect(() => {
    if (!isPushSupported()) return;

    let cancelled = false;
    getRegistration()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setState(subscription ? 'on' : 'off');
      })
      .catch(() => {
        // Registration failed: stay hidden rather than offer a dead button.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setState('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('off');
        return;
      }

      const registration = await getRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ) as BufferSource,
      });

      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error('Failed to register subscription');

      setState('on');
    } catch (err) {
      console.error('Enabling push failed:', err);
      setState('off');
    }
  }, []);

  const disable = useCallback(async () => {
    setState('busy');
    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      setState('off');
    } catch (err) {
      console.error('Disabling push failed:', err);
      setState('on');
    }
  }, []);

  if (state === 'loading') return null;

  const enabled = state === 'on';

  return (
    <Button
      iconOnly
      variant="ghost"
      onClick={enabled ? disable : enable}
      disabled={state === 'busy'}
      aria-label={enabled ? 'Disable like notifications' : 'Enable like notifications'}
      title={enabled ? 'Disable like notifications' : 'Enable like notifications'}
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
