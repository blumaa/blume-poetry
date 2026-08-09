import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sendEmail, generatePoemEmailHtml, generatePoemEmailText } from '@/lib/email';
import { z } from 'zod';

const notifySchema = z.object({
  poemId: z.string().uuid(),
});

const BATCH_SIZE = 50;

/**
 * Email the poem to every subscriber who opted into new-poem notifications.
 *
 * Sending is claimed before any mail goes out: the UPDATE only matches a
 * published poem whose `notified_at` is still null, so a double-click, a retry,
 * or a second publish of the same poem finds nothing to claim and sends
 * nothing. Mail cannot be recalled, so "at most once" beats "at least once"
 * here — if the send fails outright the claim is released for a manual retry.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { poemId } = notifySchema.parse(body);

    const supabase = createAdminClient();

    const { data: claimed, error: claimError } = await supabase
      .from('poems')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', poemId)
      .eq('status', 'published')
      .is('notified_at', null)
      .select('id, title, slug, content, plain_text');

    if (claimError) {
      console.error('Notify claim error:', claimError);
      return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
    }

    const poem = claimed?.[0];
    if (!poem) {
      // Already notified, still a draft, or no such poem — all no-ops.
      return NextResponse.json({ sent: 0, alreadyNotified: true });
    }

    const { data: subscribers, error: subscribersError } = await supabase
      .from('subscribers')
      .select('email')
      .eq('status', 'active')
      .eq('notify_new_poems', true);

    if (subscribersError) {
      console.error('Notify subscriber lookup error:', subscribersError);
      await releaseClaim(supabase, poemId);
      return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 });
    }

    const recipients = subscribers ?? [];
    if (recipients.length === 0) {
      // Nobody to tell yet. Release the claim so the poem can still be
      // announced once there is an audience for it.
      await releaseClaim(supabase, poemId);
      return NextResponse.json({ sent: 0, recipientCount: 0 });
    }

    const content = poem.content || poem.plain_text || '';
    const subject = `New poem: ${poem.title}`;
    let sent = 0;
    const failed: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ email }) => {
          const poemEmail = {
            title: poem.title,
            content,
            slug: poem.slug,
            unsubscribeEmail: email,
          };

          try {
            await sendEmail({
              to: email,
              subject,
              html: generatePoemEmailHtml(poemEmail),
              text: generatePoemEmailText(poemEmail),
            });
            sent++;
          } catch (err) {
            failed.push(email);
            console.error(`Failed to notify ${email}:`, err);
          }
        })
      );
    }

    if (sent === 0) {
      // Nothing went out — let the admin try again rather than stranding the poem.
      await releaseClaim(supabase, poemId);
      return NextResponse.json(
        { error: `Failed to notify all ${failed.length} subscribers` },
        { status: 500 }
      );
    }

    await supabase.from('email_logs').insert({
      subject,
      poem_id: poem.id,
      recipient_count: sent,
      status: failed.length > 0 ? 'partial' : 'sent',
    });

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

type AdminClient = ReturnType<typeof createAdminClient>;

async function releaseClaim(supabase: AdminClient, poemId: string) {
  const { error } = await supabase.from('poems').update({ notified_at: null }).eq('id', poemId);
  if (error) {
    console.error('Failed to release notify claim:', error);
  }
}
