import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AdminFrame } from './AdminFrame';

/* The proxy redirects non-admins before this renders; every admin route
   handler and RLS policy re-checks the role. This only reads the email. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;

  return <AdminFrame email={typeof email === 'string' ? email : undefined}>{children}</AdminFrame>;
}
