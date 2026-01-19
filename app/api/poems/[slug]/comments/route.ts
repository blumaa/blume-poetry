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

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // max comments per window
const RATE_WINDOW = 5 * 60 * 1000; // 5 minute window

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

// GET - Get comments for a poem
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  // Get comments
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id, author_name, content, created_at')
    .eq('poem_id', poem.id)
    .order('created_at', { ascending: false });

  if (commentsError) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }

  return NextResponse.json({ comments: comments || [] });
}

// POST - Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many comments. Please wait a few minutes.' }, { status: 429 });
  }

  const body = await request.json();
  const { visitorId, authorName, content, honeypot, timestamp } = body;

  // Bot protection: honeypot field should be empty
  if (honeypot) {
    // Silently reject - looks like success to bots
    return NextResponse.json({ success: true });
  }

  // Bot protection: form should take at least 3 seconds to fill out
  if (timestamp && Date.now() - timestamp < 3000) {
    return NextResponse.json({ error: 'Please take your time' }, { status: 400 });
  }

  // Validation
  if (!visitorId || !authorName?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Name and comment are required' }, { status: 400 });
  }

  const trimmedName = authorName.trim().slice(0, 100);
  const trimmedContent = content.trim().slice(0, 2000);

  if (trimmedName.length < 1 || trimmedContent.length < 1) {
    return NextResponse.json({ error: 'Name and comment are required' }, { status: 400 });
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

  // Insert comment
  const { data: newComment, error: insertError } = await supabase
    .from('comments')
    .insert({
      poem_id: poem.id,
      visitor_id: visitorId,
      author_name: trimmedName,
      content: trimmedContent,
    })
    .select('id, author_name, content, created_at')
    .single();

  if (insertError) {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }

  return NextResponse.json({ comment: newComment });
}
