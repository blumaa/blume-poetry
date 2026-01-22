import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subscriberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = subscriberSchema.parse(body);

    const supabase = createAdminClient();
    const normalizedEmail = email.toLowerCase();

    // Check if subscriber already exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { error: 'This email is already subscribed' },
          { status: 400 }
        );
      }

      // Re-activate unsubscribed user
      const { data, error } = await supabase
        .from('subscribers')
        .update({ status: 'active', verified: true })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Reactivate subscriber error:', error);
        return NextResponse.json(
          { error: 'Failed to reactivate subscriber' },
          { status: 500 }
        );
      }

      return NextResponse.json({ subscriber: data, reactivated: true });
    }

    // Insert new subscriber
    const { data, error } = await supabase
      .from('subscribers')
      .insert({
        email: normalizedEmail,
        status: 'active',
        verified: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Add subscriber error:', error);
      return NextResponse.json(
        { error: 'Failed to add subscriber' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscriber: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Add subscriber error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
