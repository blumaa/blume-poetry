import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { isRateLimited, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

// GET - Get like count and whether current visitor has liked
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const visitorId = request.headers.get('x-visitor-id') || '';

  const supabase = getSupabaseClient();

  // Get poem ID from slug
  const { data: poem, error: poemError } = await supabase
    .from('poems')
    .select('id')
    .eq('slug', slug)
    .single();

  if (poemError || !poem) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Get like count
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('poem_id', poem.id);

  // Check if visitor has liked
  let hasLiked = false;
  if (visitorId) {
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('poem_id', poem.id)
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

  // Rate limiting
  const ip = getClientIp(request);
  if (isRateLimited(ip, RATE_LIMITS.likes)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const visitorId = body.visitorId;

  if (!visitorId) {
    return NextResponse.json({ error: 'Visitor ID required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Get poem ID from slug
  const { data: poem, error: poemError } = await supabase
    .from('poems')
    .select('id')
    .eq('slug', slug)
    .single();

  if (poemError || !poem) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('poem_id', poem.id)
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
      .insert({ poem_id: poem.id, visitor_id: visitorId });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
    }

    return NextResponse.json({ liked: true });
  }
}
