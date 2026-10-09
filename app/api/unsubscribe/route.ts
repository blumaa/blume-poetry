import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { unsubscribeByToken } from '@/lib/subscribers';

// Unsubscribe links carry a signed token (lib/unsubscribeToken) instead of the
// raw email, so a link can only unsubscribe the address it was issued for.

// The link in the email footer, and in mail sent before the confirm page
// existed. Mail scanners follow links in delivered email, so a GET never
// unsubscribes: it opens the confirm page.
export async function GET(request: Request) {
  const url = new URL('/unsubscribe', request.url);
  const token = new URL(request.url).searchParams.get('token');
  if (token) url.searchParams.set('token', token);
  return NextResponse.redirect(url, 303);
}

// One-click unsubscribe (RFC 8058): the mail client POSTs here from the
// List-Unsubscribe header. It sends no Origin and no cookies, so the token is
// the only check, and it is enough. Database errors throw (500).
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const ok = await unsubscribeByToken(createAdminClient(), token);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid or missing unsubscribe token' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
