import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { POEMS_CACHE_TAG } from '@/lib/supabase/anon';

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    // Bust the cached poem/tree reads so poem edits show up immediately.
    // `{ expire: 0 }` forces immediate expiration (read-your-own-writes): after
    // the admin publishes/edits, the next visit to the site serves fresh data —
    // not the one-visit-stale behavior of the 'max' stale-while-revalidate profile.
    revalidateTag(POEMS_CACHE_TAG, { expire: 0 });

    const { paths } = await request.json();

    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json({ error: 'paths array required' }, { status: 400 });
    }

    // Revalidate each path
    for (const path of paths) {
      revalidatePath(path);
    }

    // Revalidate the root layout — covers the site-wide sidebar
    // (pinned poems) across the home page, poem pages, and all other routes.
    revalidatePath('/', 'layout');

    return NextResponse.json({ revalidated: true, paths });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 });
  }
}
