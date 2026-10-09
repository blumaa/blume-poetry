import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  // requireAdmin is the authorization; the delete runs as the service role.
  // A database error throws and Next answers a generic 500.
  const { data: deleted } = await createAdminClient()
    .from('comments')
    .delete()
    .eq('id', id)
    .select('id')
    .throwOnError();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
