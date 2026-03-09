import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/config';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ isAdmin: false });
  }

  return Response.json({ isAdmin: isAdminEmail(user.email) });
}
