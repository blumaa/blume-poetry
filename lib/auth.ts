import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/config';

/**
 * Single source of truth for "is this request from the admin?" across every
 * admin API route. Standardizes the response for the two failure modes that
 * were previously inconsistent between routes: no session at all (401) vs.
 * an authenticated-but-non-admin session (403).
 *
 * Returns `{ user }` on success, or a NextResponse the caller should return
 * immediately:
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAdmin(): Promise<
  { user: { email?: string | null } } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user };
}
