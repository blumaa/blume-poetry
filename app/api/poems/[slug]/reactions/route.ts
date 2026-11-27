import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getPoemRefBySlug } from '@/lib/poems';
import { poemHref } from '@/lib/collections';
import { sendReactionNotification } from '@/lib/push';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { verifyOrigin } from '@/lib/csrf';
import type { CommentReactions, PoemReactions, ReactionCount } from '@/features/reactions';

// Not cached like comments: counts change per reaction and `mine` is per visitor.
// Database errors throw (.throwOnError) and Next answers 500.

const toggleSchema = z.object({
  visitorId: z.string().min(1, 'Visitor ID required'),
  commentId: z.uuid('Invalid comment'),
  // The catalogue decides which emoji exist; this only bounds the input.
  emoji: z.string().min(1, 'Emoji required').max(64, 'Invalid emoji'),
});

// GET - Every reacted comment's counts, and this visitor's own emoji
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const visitorId = request.headers.get('x-visitor-id') || '';

  const poem = await getPoemRefBySlug(slug);
  if (!poem) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  const { data } = await createAdminClient()
    .rpc('poem_comment_reactions', { p_poem_id: poem.id, p_visitor_id: visitorId })
    .throwOnError();

  const reactions: PoemReactions = Object.fromEntries(
    data.map((row) => [
      row.comment_id,
      { counts: row.reactions as unknown as ReactionCount[], mine: row.mine },
    ])
  );
  return NextResponse.json({ reactions });
}

// POST - Toggle one emoji on one comment; answers the comment's reactions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.reactions);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { visitorId, commentId, emoji } = parsed.data;

  const poem = await getPoemRefBySlug(slug);
  if (!poem) {
    return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
  }

  const admin = createAdminClient();

  // The foreign keys also refuse these; checking here answers 400, not 500.
  const [{ data: comment }, { data: known }] = await Promise.all([
    admin
      .from('comments')
      .select('author_name')
      .eq('id', commentId)
      .eq('poem_id', poem.id)
      .is('removed_at', null)
      .maybeSingle()
      .throwOnError(),
    admin.from('emoji').select('char').eq('char', emoji).maybeSingle().throwOnError(),
  ]);
  if (!comment) {
    return NextResponse.json({ error: 'That comment can no longer be reacted to' }, { status: 400 });
  }
  if (!known) {
    return NextResponse.json({ error: 'Unknown emoji' }, { status: 400 });
  }

  // One atomic call toggles and summarises (20261127000000_comment_reactions.sql).
  const { data } = await admin
    .rpc('toggle_comment_reaction', { p_comment_id: commentId, p_visitor_id: visitorId, p_emoji: emoji })
    .single()
    .throwOnError();

  if (data.added) {
    // Push goes to Apple/Google servers: send it after the response.
    // sendReactionNotification never throws.
    after(() =>
      sendReactionNotification({
        emoji,
        commentAuthor: comment.author_name,
        poemTitle: poem.title,
        url: poemHref(poem.collection, slug),
      })
    );
  }

  const reactions: CommentReactions = {
    counts: data.reactions as unknown as ReactionCount[],
    mine: data.mine,
  };
  return NextResponse.json({ reactions });
}
