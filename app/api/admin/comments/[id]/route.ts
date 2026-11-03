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

  // requireAdmin is the authorization; the write runs as the service role.
  // The row stays, scrubbed, so replies keep their place under a tombstone.
  // A database error throws and Next answers a generic 500.
  const { data: removed } = await createAdminClient()
    .from('comments')
    .update({ author_name: '', content: '', removed_at: new Date().toISOString() })
    .eq('id', id)
    .is('removed_at', null)
    .select('id')
    .throwOnError();

  if (removed.length === 0) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
