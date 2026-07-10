import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

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
