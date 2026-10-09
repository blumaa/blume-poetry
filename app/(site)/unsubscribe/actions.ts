'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { unsubscribeByToken } from '@/lib/subscribers';

// The confirm page's button. Reachable by direct POST like any server
// function; the signed token is the authorization.
export async function unsubscribe(formData: FormData) {
  const token = formData.get('token');
  const ok = await unsubscribeByToken(createAdminClient(), typeof token === 'string' ? token : null);
  redirect(ok ? '/unsubscribe?done=1' : '/unsubscribe');
}
