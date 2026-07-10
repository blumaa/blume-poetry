import { NextRequest, NextResponse } from 'next/server';
import { getAnonClient } from '@/lib/supabase/anon';
import { createAdminClient } from '@/lib/supabase/server';
import { getPoemIdBySlug } from '@/lib/poems';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyOrigin } from '@/lib/csrf';

// GET - Get comments for a poem
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = getAnonClient();

  // Get poem ID from slug
  const poemId = await getPoemIdBySlug(slug);

  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Get comments
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id, author_name, content, created_at')
    .eq('poem_id', poemId)
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

  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = checkRateLimit(request, RATE_LIMITS.comments);
  if (rateLimitError) return rateLimitError;

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

  const supabase = createAdminClient();

  // Get poem ID from slug
  const poemId = await getPoemIdBySlug(slug);

  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  // Insert comment
  const { data: newComment, error: insertError } = await supabase
    .from('comments')
    .insert({
      poem_id: poemId,
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
