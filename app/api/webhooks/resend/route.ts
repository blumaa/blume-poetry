import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Resend webhook event types
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    click?: {
      link: string;
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
    open?: {
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
  };
}

// Map Resend event types to our event types
function mapEventType(resendType: string): 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' {
  const mapping: Record<string, 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  };
  return mapping[resendType] || 'sent';
}

// Verify Resend webhook signature (Svix)
function verifySignature(payload: string, signatureHeader: string, secret: string): boolean {
  if (!secret) return true; // Skip verification if no secret configured

  try {
    // Svix signature format: v1,signature
    const signatures = signatureHeader.split(' ');
    for (const sig of signatures) {
      const [version, signature] = sig.split(',');
      if (version === 'v1') {
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('base64');

        if (signature === expectedSignature) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('svix-signature') || '';
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || '';

    // Verify signature if secret is configured
    if (webhookSecret && !verifySignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: ResendWebhookEvent = JSON.parse(payload);
    const supabase = createAdminClient();

    // Extract event data
    const eventType = mapEventType(event.type);
    const emailId = event.data.email_id;
    const recipientEmail = event.data.to?.[0] || null;

    // Find the email_log entry by resend_email_id
    const { data: emailLog } = await supabase
      .from('email_logs')
      .select('id')
      .eq('resend_email_id', emailId)
      .single();

    // Build event data
    const eventData: {
      resend_email_id: string;
      event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
      recipient_email: string | null;
      email_log_id: string | null;
      link_url: string | null;
      user_agent: string | null;
      ip_address: string | null;
    } = {
      resend_email_id: emailId,
      event_type: eventType,
      recipient_email: recipientEmail,
      email_log_id: emailLog?.id || null,
      link_url: null,
      user_agent: null,
      ip_address: null,
    };

    // Add click-specific data
    if (event.type === 'email.clicked' && event.data.click) {
      eventData.link_url = event.data.click.link;
      eventData.user_agent = event.data.click.userAgent;
      eventData.ip_address = event.data.click.ipAddress;
    }

    // Add open-specific data
    if (event.type === 'email.opened' && event.data.open) {
      eventData.user_agent = event.data.open.userAgent;
      eventData.ip_address = event.data.open.ipAddress;
    }

    // Insert the event
    const { error: insertError } = await supabase.from('email_events').insert(eventData);

    if (insertError) {
      console.error('Failed to insert email event:', insertError);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
