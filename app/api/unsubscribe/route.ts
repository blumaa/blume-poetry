import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

// One-click unsubscribe from an email link. The link carries a signed token
// (see lib/unsubscribeToken) instead of the raw email, so it can only
// unsubscribe the address it was issued for — not an arbitrary victim.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const email = token ? verifyUnsubscribeToken(token) : null;
  if (!email) {
    return NextResponse.json(
      { error: 'Invalid or missing unsubscribe token' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('email', email);

  if (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }

  // Redirect to the unsubscribe confirmation page
  return NextResponse.redirect(new URL('/unsubscribe', request.url));
}
