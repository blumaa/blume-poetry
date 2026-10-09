import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/config';

interface LikeNotification {
  poemTitle: string;
  slug: string;
}

// Passed with each send rather than set with webpush.setVapidDetails, which
// writes web-push's module-wide state.
function getVapidDetails(): webpush.VapidKeys & { subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { subject: `mailto:admin@${new URL(getSiteUrl()).hostname}`, publicKey, privateKey };
}

/**
 * Push a "someone liked your poem" notification to every registered admin
 * device. Never throws: a like must never fail because a notification could
 * not be delivered. Subscriptions the push service reports as gone (404/410 —
 * browser revoked or user cleared site data) are pruned so dead endpoints
 * don't accumulate.
 */
export async function sendLikeNotification({ poemTitle, slug }: LikeNotification): Promise<void> {
  const vapidDetails = getVapidDetails();
  if (!vapidDetails) return;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');

  if (error || !data) {
    if (error) console.error('Push subscription lookup failed:', error);
    return;
  }

  const payload = JSON.stringify({
    title: `Someone liked “${poemTitle}”`,
    body: 'Tap to see the poem.',
    url: `/poem/${slug}`,
  });

  await Promise.all(
    data.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          { vapidDetails }
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          const { error } = await supabase.from('push_subscriptions').delete().eq('id', row.id);
          if (error) console.error('Failed to delete gone push subscription:', error);
        } else {
          console.error('Push delivery failed:', err);
        }
      }
    })
  );
}
