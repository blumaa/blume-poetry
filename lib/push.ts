import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/config';
import type { PushSubscriptionRow } from '@/lib/supabase/types';

interface LikeNotification {
  poemTitle: string;
  slug: string;
}

function getVapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

/**
 * Push a "someone liked your poem" notification to every registered admin
 * device. Never throws: a like must never fail because a notification could
 * not be delivered. Subscriptions the push service reports as gone (404/410 —
 * browser revoked or user cleared site data) are pruned so dead endpoints
 * don't accumulate.
 */
export async function sendLikeNotification({ poemTitle, slug }: LikeNotification): Promise<void> {
  const vapid = getVapidKeys();
  if (!vapid) return;

  webpush.setVapidDetails(`mailto:admin@${new URL(getSiteUrl()).hostname}`, vapid.publicKey, vapid.privateKey);

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('push_subscriptions').select();

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
    (data as PushSubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id);
        } else {
          console.error('Push delivery failed:', err);
        }
      }
    })
  );
}
