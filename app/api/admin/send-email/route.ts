import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, generateNewsletterHtml, generateNewsletterText } from '@/lib/email';
import { z } from 'zod';
import type { Poem, Subscriber } from '@/lib/supabase/types';

const sendEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body content is required'),
  bodyText: z.string().min(1, 'Body text is required'),
  poemId: z.string().uuid().optional(),
  testEmail: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== (process.env.ADMIN_EMAIL || 'desmond.blume@gmail.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, bodyHtml, bodyText, poemId, testEmail } = sendEmailSchema.parse(body);

    const adminSupabase = createAdminClient();

    // Get the poem if provided
    let poemData: Poem | null = null;
    if (poemId) {
      const { data: poem, error: poemError } = await adminSupabase
        .from('poems')
        .select('*')
        .eq('id', poemId)
        .single();

      if (poemError || !poem) {
        return NextResponse.json({ error: 'Poem not found' }, { status: 404 });
      }
      poemData = poem as Poem;
    }

    // Build poem attachment data if poem is selected
    const poemAttachment = poemData ? {
      title: poemData.title,
      content: poemData.plain_text || poemData.content,
      slug: poemData.slug,
    } : undefined;

    // If test email, send only to that address
    if (testEmail) {
      const html = generateNewsletterHtml({
        subject,
        bodyHtml,
        bodyText,
        poem: poemAttachment,
        unsubscribeEmail: testEmail,
      });
      const text = generateNewsletterText({
        subject,
        bodyHtml,
        bodyText,
        poem: poemAttachment,
        unsubscribeEmail: testEmail,
      });

      try {
        await sendEmail({
          to: testEmail,
          subject: `[TEST] ${subject}`,
          html,
          text,
        });
      } catch (emailError) {
        console.error('Test email error:', emailError);
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        return NextResponse.json({
          error: `Failed to send test email: ${errorMessage}`,
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Test email sent successfully',
        recipientCount: 1,
      });
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await adminSupabase
      .from('subscribers')
      .select('*')
      .eq('status', 'active');

    if (subscribersError) {
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }

    const activeSubscribers = (subscribers as Subscriber[]) || [];

    if (activeSubscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 });
    }

    // Send emails in batches
    const batchSize = 50;
    let sent = 0;
    const errors: string[] = [];
    const resendEmailIds: string[] = [];

    for (let i = 0; i < activeSubscribers.length; i += batchSize) {
      const batch = activeSubscribers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const html = generateNewsletterHtml({
              subject,
              bodyHtml,
              bodyText,
              poem: poemAttachment,
              unsubscribeEmail: subscriber.email,
            });
            const text = generateNewsletterText({
              subject,
              bodyHtml,
              bodyText,
              poem: poemAttachment,
              unsubscribeEmail: subscriber.email,
            });

            const result = await sendEmail({
              to: subscriber.email,
              subject,
              html,
              text,
            });
            sent++;
            if (result?.id) {
              resendEmailIds.push(result.id);
            }
          } catch (err) {
            errors.push(subscriber.email);
            console.error(`Failed to send to ${subscriber.email}:`, err);
          }
        })
      );
    }

    // If all emails failed, return an error
    if (sent === 0 && errors.length > 0) {
      return NextResponse.json({
        error: `Failed to send to all ${errors.length} subscribers. Check your email configuration.`,
        errors,
      }, { status: 500 });
    }

    // Log the email send
    await adminSupabase.from('email_logs').insert({
      subject,
      poem_id: poemId || null,
      recipient_count: sent,
      status: errors.length > 0 ? 'partial' : 'sent',
      resend_email_id: resendEmailIds[0] || null,
    });

    return NextResponse.json({
      message: `Sent to ${sent} subscriber${sent !== 1 ? 's' : ''}${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      recipientCount: sent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }

    console.error('Send email error:', err);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
