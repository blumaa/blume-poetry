import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
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
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
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
