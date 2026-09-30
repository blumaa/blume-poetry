/* This browser's like-notification push subscription. The browser's
   PushManager is the source of truth; the server holds a copy for sending. */

export function isPushSupported(): boolean {
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

function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

export async function isSubscribed(): Promise<boolean> {
  const registration = await getRegistration();
  return (await registration.pushManager.getSubscription()) !== null;
}

/** Asks permission, subscribes, registers with the server. A refused permission is not an error. */
export async function subscribe(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

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
}

export async function unsubscribe(): Promise<void> {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();
  const res = await fetch('/api/push', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!res.ok) throw new Error('Failed to remove subscription');
}
