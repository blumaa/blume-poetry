import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getAnonClient } from '@/lib/supabase/anon';
import { createAdminClient } from '@/lib/supabase/server';
import { getPoemRefBySlug } from '@/lib/poems';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyOrigin } from '@/lib/csrf';
import { notifyCommentReply } from '@/lib/commentReplies';

const COMMENT_COLUMNS = 'id, parent_id, author_name, content, created_at, removed_at';

/* Bot checks run before validation, so a bot never learns which fields failed. */
const required = 'Name and comment are required';
const commentSchema = z.object({
  visitorId: z.string(required).min(1, required),
  authorName: z.string(required).trim().min(1, required).max(100, 'Name is too long'),
  content: z.string(required).trim().min(1, required).max(2000, 'Comment is too long'),
  parentId: z.uuid('Invalid reply').nullable().default(null),
  // Optional, private: only for telling the commenter about replies.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((email) => (email === '' ? null : email))
    .pipe(z.email('Invalid email').max(254, 'Invalid email').nullable())
    .nullable()
    .default(null),
});

const botFields = z.object({
  honeypot: z.string().optional(),
  timestamp: z.number().optional(),
});

// Database errors throw (.throwOnError) and Next answers 500.

// GET - A poem's comments in written order; removed ones come back scrubbed
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const poem = await getPoemRefBySlug(slug);
  if (!poem) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  const { data: comments } = await getAnonClient()
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('poem_id', poem.id)
    // Written order: a reply never precedes what it answers.
    .order('created_at', { ascending: true })
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
  const { visitorId, authorName, content, parentId, email } = parsed.data;

  const poem = await getPoemRefBySlug(slug);
  if (!poem) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  const admin = createAdminClient();

  // A reply answers a live comment on this poem. The database also refuses
  // another poem's comment; checking here answers 400, not 500.
  if (parentId !== null) {
    const { data: parent } = await admin
      .from('comments')
      .select('id')
      .eq('id', parentId)
      .eq('poem_id', poem.id)
      .is('removed_at', null)
      .maybeSingle()
      .throwOnError();
    if (!parent) {
      return NextResponse.json(
        { error: 'That comment can no longer be replied to' },
        { status: 400 }
      );
    }
  }

  // One call saves the comment and its email together (add_comment).
  const { data: comment } = await admin
    .rpc('add_comment', {
      p_poem_id: poem.id,
      p_visitor_id: visitorId,
      p_author_name: authorName,
      p_content: content,
      // Left out when absent; the function defaults them to null.
      p_parent_id: parentId ?? undefined,
      p_email: email ?? undefined,
    })
    .select(COMMENT_COLUMNS)
    .single()
    .throwOnError();

  if (parentId !== null) {
    // Mail goes through Gmail: send it after the response so the reply never
    // waits on it. notifyCommentReply never throws.
    after(() =>
      notifyCommentReply({
        parentId,
        authorName,
        content,
        replierEmail: email,
        poem: { title: poem.title, slug, collection: poem.collection },
      })
    );
  }

  return NextResponse.json({ comment });
}
