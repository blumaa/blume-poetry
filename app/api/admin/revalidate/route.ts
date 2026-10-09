import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { POEMS_CACHE_TAG } from '@/lib/supabase/anon';

// Every public poem read goes through the tagged client
// (lib/supabase/anon getCachedPoemClient), so the tag reaches every page that
// shows a poem, the sidebar, and the sitemap. `{ expire: 0 }`: the admin's
// next visit sees the change, not one stale render.
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  revalidateTag(POEMS_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
