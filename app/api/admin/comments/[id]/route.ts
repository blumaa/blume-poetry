import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/config';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the user is an admin
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Auth is verified above via the cookie-auth client; the actual delete runs
  // through the service-role client so it doesn't depend on RLS's hardcoded-email
  // policy. isAdminEmail() is the single source of truth for delete authorization.
  const adminSupabase = createAdminClient();
  const { error: deleteError } = await adminSupabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
