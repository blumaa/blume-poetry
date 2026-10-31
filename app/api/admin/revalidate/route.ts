import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { CACHE_SCOPES, CACHE_TAGS } from '@/lib/cacheTags';

const revalidateSchema = z.object({ scope: z.enum(CACHE_SCOPES) });

// Every public read goes through a tagged client (lib/supabase/anon), so the
// poems tag reaches every page that shows a poem, the sidebar, the sitemap and
// the publications page; the publications tag reaches that page only.
// `{ expire: 0 }`: the admin's next visit sees the change, not one stale render.
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const parsed = revalidateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Unknown revalidate scope' }, { status: 400 });
  }

  revalidateTag(CACHE_TAGS[parsed.data.scope], { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
