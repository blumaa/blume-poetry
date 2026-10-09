import { NextRequest, NextResponse, after } from 'next/server';
import { getAnonClient } from '@/lib/supabase/anon';
import { createAdminClient } from '@/lib/supabase/server';
import { getPoemIdBySlug, getPoemBySlug } from '@/lib/poems';
import { sendLikeNotification } from '@/lib/push';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyOrigin } from '@/lib/csrf';
import type { LikeState } from '@/features/likes';

// Database errors throw (.throwOnError) and Next answers 500: a failed read
// must not pass as "no likes", nor a failed write as success.

// GET - Get like count and whether current visitor has liked
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const visitorId = request.headers.get('x-visitor-id') || '';

  const supabase = getAnonClient();

  const poemId = await getPoemIdBySlug(slug);

  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Count and visitor check are independent: run them together.
  const [{ count }, existingLike] = await Promise.all([
    supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('poem_id', poemId)
      .throwOnError(),
    visitorId
      ? supabase
          .from('likes')
          .select('id')
          .eq('poem_id', poemId)
          .eq('visitor_id', visitorId)
          .maybeSingle()
          .throwOnError()
      : null,
  ]);

  const state: LikeState = { count: count ?? 0, hasLiked: !!existingLike?.data };
  return NextResponse.json(state);
}

// POST - Toggle like; answers the new state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.likes);
  if (rateLimitError) return rateLimitError;

  const body = await request.json();
  const visitorId = body.visitorId;

  if (!visitorId) {
    return NextResponse.json({ error: 'Visitor ID required' }, { status: 400 });
  }

  const poemId = await getPoemIdBySlug(slug);

  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // One atomic call: toggles and counts (supabase/migrations/20261009_add_toggle_like.sql).
  const { data } = await createAdminClient()
    .rpc('toggle_like', { p_poem_id: poemId, p_visitor_id: visitorId })
    .single()
    .throwOnError();

  if (data.liked) {
    // Push goes to Apple/Google servers: send it after the response so the
    // like never waits on it. sendLikeNotification never throws.
    after(async () => {
      const poem = await getPoemBySlug(slug);
      if (poem) await sendLikeNotification({ poemTitle: poem.title, slug });
    });
  }

  const state: LikeState = { count: data.like_count, hasLiked: data.liked };
  return NextResponse.json(state);
}
