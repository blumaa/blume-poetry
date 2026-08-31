import { NextRequest, NextResponse } from 'next/server';
import { getAnonClient } from '@/lib/supabase/anon';
import { createAdminClient } from '@/lib/supabase/server';
import { getPoemIdBySlug, getPoemBySlug } from '@/lib/poems';
import { sendLikeNotification } from '@/lib/push';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyOrigin } from '@/lib/csrf';

// GET - Get like count and whether current visitor has liked
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const visitorId = request.headers.get('x-visitor-id') || '';

  const supabase = getAnonClient();

  // Get poem ID from slug
  const poemId = await getPoemIdBySlug(slug);

  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Get like count
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('poem_id', poemId);

  // Check if visitor has liked
  let hasLiked = false;
  if (visitorId) {
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('poem_id', poemId)
      .eq('visitor_id', visitorId)
      .single();

    hasLiked = !!existingLike;
  }

  return NextResponse.json({ count: count || 0, hasLiked });
}

// POST - Toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = checkRateLimit(request, RATE_LIMITS.likes);
  if (rateLimitError) return rateLimitError;

  const body = await request.json();
  const visitorId = body.visitorId;

  if (!visitorId) {
    return NextResponse.json({ error: 'Visitor ID required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get poem ID from slug
  const poemId = await getPoemIdBySlug(slug);

  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('poem_id', poemId)
    .eq('visitor_id', visitorId)
    .single();

  if (existingLike) {
    // Unlike
    await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id);

    return NextResponse.json({ liked: false });
  } else {
    // Like
    const { error: insertError } = await supabase
      .from('likes')
      .insert({ poem_id: poemId, visitor_id: visitorId });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
    }

    // Notify the admin's devices. sendLikeNotification never throws, so a
    // push outage can't fail the like itself.
    const poem = await getPoemBySlug(slug);
    if (poem) {
      await sendLikeNotification({ poemTitle: poem.title, slug });
    }

    return NextResponse.json({ liked: true });
  }
}
