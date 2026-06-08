import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/config';

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
