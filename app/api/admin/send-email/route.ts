import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  sendEmail,
  sendToSubscribers,
  generateNewsletterHtml,
  generateNewsletterText,
} from '@/lib/email';
import { requireAdmin } from '@/lib/auth';
import { finishEmailLog, startEmailLog } from '@/lib/emailLog';
import { z } from 'zod';

// A whole-list send outlives the default function timeout.
export const maxDuration = 300;

const sendEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body content is required'),
  bodyText: z.string().min(1, 'Body text is required'),
  poemId: z.string().uuid().optional(),
  testEmail: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { subject, bodyHtml, bodyText, poemId, testEmail } = sendEmailSchema.parse(body);

    const adminSupabase = createAdminClient();

    let poem: { title: string; content: string; slug: string } | undefined;
    if (poemId) {
      const { data } = await adminSupabase
        .from('poems')
        .select('title, slug, content, plain_text')
        .eq('id', poemId)
        .maybeSingle()
        .throwOnError();

      if (!data) {
        return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
      }
      // `content` is the canonical copy the site renders; `plain_text` is a
      // lossy search index and only a fallback for rows saved before rich text.
      poem = { title: data.title, content: data.content || data.plain_text || '', slug: data.slug };
    }

    const build = (email: string) => {
      const newsletter = { subject, bodyHtml, bodyText, poem, unsubscribeEmail: email };
      return { subject, html: generateNewsletterHtml(newsletter), text: generateNewsletterText(newsletter) };
    };

    if (testEmail) {
      const mail = build(testEmail);
      try {
        await sendEmail({ ...mail, to: testEmail, subject: `[TEST] ${subject}` });
      } catch (emailError) {
        console.error('Test email error:', emailError);
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to send test email: ${errorMessage}` }, { status: 500 });
      }
      return NextResponse.json({ message: 'Test email sent successfully', recipientCount: 1 });
    }

    const { data: subscribers } = await adminSupabase
      .from('subscribers')
      .select('email')
      .eq('status', 'active')
      .throwOnError();

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 });
    }

    const logId = await startEmailLog(adminSupabase, { subject, poem_id: poemId ?? null });
    const result = await sendToSubscribers(subscribers.map((s) => s.email), build);
    await finishEmailLog(adminSupabase, logId, result);

    const { sent, failed } = result;
    if (sent === 0) {
      return NextResponse.json(
        {
          error: `Failed to send to all ${failed.length} subscribers. Check your email configuration.`,
          errors: failed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Sent to ${sent} subscriber${sent !== 1 ? 's' : ''}${failed.length > 0 ? ` (${failed.length} failed)` : ''}`,
      recipientCount: sent,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }

    console.error('Send email error:', err);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}
