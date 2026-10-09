import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAnonClient } from '@/lib/supabase/anon';
import { createAdminClient } from '@/lib/supabase/server';
import { getPoemIdBySlug } from '@/lib/poems';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyOrigin } from '@/lib/csrf';

const COMMENT_COLUMNS = 'id, author_name, content, created_at';

/* Bot checks run before validation, so a bot never learns which fields failed. */
const required = 'Name and comment are required';
const commentSchema = z.object({
  visitorId: z.string(required).min(1, required),
  authorName: z.string(required).trim().min(1, required).max(100, 'Name is too long'),
  content: z.string(required).trim().min(1, required).max(2000, 'Comment is too long'),
});

const botFields = z.object({
  honeypot: z.string().optional(),
  timestamp: z.number().optional(),
});

// Database errors throw (.throwOnError) and Next answers 500.

// GET - Get comments for a poem
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const poemId = await getPoemIdBySlug(slug);
  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  const { data: comments } = await getAnonClient()
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('poem_id', poemId)
    .order('created_at', { ascending: false })
    .throwOnError();

  return NextResponse.json({ comments });
}

// POST - Add a comment; answers the saved comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.comments);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const bot = botFields.safeParse(body);
  // Honeypot filled: silently reject, looks like success to bots.
  if (bot.success && bot.data.honeypot) {
    return NextResponse.json({ success: true });
  }
  // A human takes at least 3 seconds to write a comment.
  if (bot.success && bot.data.timestamp && Date.now() - bot.data.timestamp < 3000) {
    return NextResponse.json({ error: 'Please take your time' }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { visitorId, authorName, content } = parsed.data;

  const poemId = await getPoemIdBySlug(slug);
  if (!poemId) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  const { data: comment } = await createAdminClient()
    .from('comments')
    .insert({
      poem_id: poemId,
      visitor_id: visitorId,
      author_name: authorName,
      content,
    })
    .select(COMMENT_COLUMNS)
    .single()
    .throwOnError();

  return NextResponse.json({ comment });
}
