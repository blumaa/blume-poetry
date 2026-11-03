import { createAdminClient } from '@/lib/supabase/server';
import { generateCommentReplyEmail, sendEmail, unsubscribeHeaders } from '@/lib/email';
import { getSiteUrl } from '@/lib/config';
import { poemHref, type PoemCollection } from '@/lib/collections';

export interface CommentReply {
  parentId: string;
  authorName: string;
  content: string;
  /** The replier's own address, so answering yourself sends nothing. */
  replierEmail: string | null;
  poem: { title: string; slug: string; collection: PoemCollection };
}

/**
 * Emails the author of the answered comment, when they left an address.
 * Runs after the reply is saved and answered, so it never throws: a failed
 * send is logged and the reply stands.
 */
export async function notifyCommentReply(reply: CommentReply): Promise<void> {
  try {
    const { data: answered } = await createAdminClient()
      .from('comment_emails')
      .select('email, comment:comments(content)')
      .eq('comment_id', reply.parentId)
      .maybeSingle()
      .throwOnError();

    if (!answered?.comment || answered.email === reply.replierEmail) return;

    const mail = generateCommentReplyEmail({
      poemTitle: reply.poem.title,
      poemUrl: `${getSiteUrl()}${poemHref(reply.poem.collection, reply.poem.slug)}`,
      originalContent: answered.comment.content,
      replyAuthor: reply.authorName,
      replyContent: reply.content,
      unsubscribeEmail: answered.email,
    });

    await sendEmail({ to: answered.email, ...mail, headers: unsubscribeHeaders(answered.email) });
  } catch (err) {
    console.error('Failed to send comment reply email:', err);
  }
}
