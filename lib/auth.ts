import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hasAdminRole } from '@/lib/adminRole';
import { verifyOrigin } from '@/lib/csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guard for every admin API route. Writes must come from the site's origin
 * (the session cookie alone would let another site post on the admin's
 * behalf), then the session must belong to a user with the admin role.
 *
 * Returns `{ user }`, or a response the caller returns as is:
 *   const auth = await requireAdmin(request);
 *   if (auth instanceof Response) return auth;
 */
export async function requireAdmin(request: Request): Promise<{ user: User } | Response> {
  if (!SAFE_METHODS.has(request.method)) {
    const csrfError = verifyOrigin(request);
    if (csrfError) return csrfError;
  }

  // getUser asks the auth server, so a revoked session fails here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAdminRole(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user };
}
