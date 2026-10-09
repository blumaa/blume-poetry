import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { finishEmailLog, startEmailLog } from '@/lib/emailLog';
import { sendToSubscribers, generatePoemEmailHtml, generatePoemEmailText } from '@/lib/email';
import { z } from 'zod';

// A whole-list send outlives the default function timeout.
export const maxDuration = 300;

const notifySchema = z.object({
  poemId: z.string().uuid(),
});

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Email the poem to every subscriber who opted into new-poem notifications.
 *
 * Sending is claimed before any mail goes out: the UPDATE only matches a
 * published poem whose `notified_at` is still null, so a double-click, a retry,
 * or a second publish of the same poem finds nothing to claim and sends
 * nothing. Mail cannot be recalled, so "at most once" beats "at least once"
 * here: the claim is released only while nothing has gone out.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { poemId } = notifySchema.parse(body);

    const supabase = createAdminClient();

    const { data: claimed } = await supabase
      .from('poems')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', poemId)
      .eq('status', 'published')
      .is('notified_at', null)
      .select('id, title, slug, content, plain_text')
      .throwOnError();

    const poem = claimed[0];
    if (!poem) {
      // Already notified, still a draft, or no such poem: all no-ops.
      return NextResponse.json({ sent: 0, alreadyNotified: true });
    }

    const subject = `New poem: ${poem.title}`;
    let recipients: string[];
    let logId: string;
    try {
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('email')
        .eq('status', 'active')
        .eq('notify_new_poems', true)
        .throwOnError();
      recipients = subscribers.map((s) => s.email);

      if (recipients.length === 0) {
        // Nobody to tell yet. Release the claim so the poem can still be
        // announced once there is an audience for it.
        await releaseClaim(supabase, poemId);
        return NextResponse.json({ sent: 0, recipientCount: 0 });
      }

      logId = await startEmailLog(supabase, { subject, poem_id: poem.id });
    } catch (err) {
      await releaseClaim(supabase, poemId);
      throw err;
    }

    const content = poem.content || poem.plain_text || '';
    const result = await sendToSubscribers(recipients, (email) => {
      const poemEmail = { title: poem.title, content, slug: poem.slug, unsubscribeEmail: email };
      return { subject, html: generatePoemEmailHtml(poemEmail), text: generatePoemEmailText(poemEmail) };
    });
    await finishEmailLog(supabase, logId, result);

    const { sent, failed } = result;
    if (sent === 0) {
      // Nothing went out: let the admin try again rather than stranding the poem.
      await releaseClaim(supabase, poemId);
      return NextResponse.json(
        { error: `Failed to notify all ${failed.length} subscribers` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sent,
      recipientCount: recipients.length,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'A poem id is required' }, { status: 400 });
    }

    console.error('Notify poem error:', err);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}

// Runs on a failure path, so a failed release is reported rather than thrown
// over the original error.
async function releaseClaim(supabase: AdminClient, poemId: string) {
  const { error } = await supabase.from('poems').update({ notified_at: null }).eq('id', poemId);
  if (error) console.error('Failed to release notify claim:', error);
}
