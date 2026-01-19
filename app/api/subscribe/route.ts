import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = subscribeSchema.parse(body);

    const supabase = createAdminClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { error: 'This email is already subscribed' },
          { status: 400 }
        );
      }

      // Reactivate if previously unsubscribed
      await supabase
        .from('subscribers')
        .update({ status: 'active', subscribed_at: new Date().toISOString() })
        .eq('id', existing.id);

      return NextResponse.json({ message: 'Successfully resubscribed!' });
    }

    // Insert new subscriber
    const { error } = await supabase.from('subscribers').insert({
      email,
      status: 'active',
      verified: false,
    });

    if (error) {
      console.error('Subscription error:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Successfully subscribed!' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Subscription error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
