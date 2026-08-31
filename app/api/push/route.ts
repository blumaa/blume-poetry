import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyOrigin } from '@/lib/csrf';

// Registers the admin's browser as a push notification target. Admin-only:
// these rows are exactly the set of devices that receive like notifications.
const subscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.url(),
});

export async function POST(request: Request) {
  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { endpoint, keys } = subscribeSchema.parse(body);

    const supabase = createAdminClient();
    // Upsert keyed on endpoint: re-subscribing from the same browser (e.g.
    // after a permission re-grant) refreshes the keys instead of duplicating.
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Push subscribe error:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    console.error('Push subscribe error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { endpoint } = unsubscribeSchema.parse(body);

    const supabase = createAdminClient();
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

    if (error) {
      console.error('Push unsubscribe error:', error);
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Push unsubscribe error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
