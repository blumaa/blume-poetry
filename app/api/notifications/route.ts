import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyEmailToken } from '@/lib/emailToken';
import { verifyOrigin } from '@/lib/csrf';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { z } from 'zod';

// Set (never toggle) a subscriber's new-poem notification preference.
//
// The action is explicit and the endpoint is POST-only on purpose: mail
// scanners and link-preview fetchers issue GETs for every URL in an email, and
// a toggle would flip the setting behind the user's back — possibly twice.
// Setting an absolute value keeps a repeated request harmless.
const notificationsSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['on', 'off']),
});

/**
 * Read the current preference so the settings page can show the reader where
 * they actually stand instead of guessing. Safe as a GET: it changes nothing,
 * and the signed token only ever reveals the holder's own setting.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const email = token ? verifyEmailToken(token, 'notifications') : null;
  if (!email) {
    return NextResponse.json({ error: 'This link is no longer valid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscribers')
    .select('notify_new_poems, status')
    .eq('email', email)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'We could not find that subscription' }, { status: 404 });
  }

  return NextResponse.json({
    email,
    enabled: data.notify_new_poems,
    unsubscribed: data.status === 'unsubscribed',
  });
}

export async function POST(request: Request) {
  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = checkRateLimit(request, RATE_LIMITS.subscriptions);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { token, action } = notificationsSchema.parse(body);

    // Scoped to 'notifications', so an unsubscribe link can't be replayed here.
    const email = verifyEmailToken(token, 'notifications');
    if (!email) {
      return NextResponse.json({ error: 'This link is no longer valid' }, { status: 400 });
    }

    const enabled = action === 'on';
    const supabase = createAdminClient();

    // Reading `status` back confirms a row was actually matched — a signed
    // token for an address that has since been deleted would otherwise get a
    // cheerful success it can't act on — and lets the page say so when the
    // reader has unsubscribed from everything.
    const { data, error } = await supabase
      .from('subscribers')
      .update({ notify_new_poems: enabled })
      .eq('email', email)
      .select<'status', { status: string }>('status')
      .single();

    if (error || !data) {
      console.error('Notification preference error:', error);
      return NextResponse.json({ error: 'We could not find that subscription' }, { status: 404 });
    }

    return NextResponse.json({ enabled, email, unsubscribed: data.status === 'unsubscribed' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    console.error('Notification preference error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
