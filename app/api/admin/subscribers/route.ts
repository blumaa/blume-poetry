import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { upsertSubscriber } from '@/lib/subscribers';
import { z } from 'zod';

const subscriberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    // Verify admin authentication — this route uses the service-role client,
    // so it must never be reachable by anonymous callers.
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { email } = subscriberSchema.parse(body);

    const supabase = createAdminClient();

    const result = await upsertSubscriber(supabase, email, { status: 'active', verified: true });

    if (result.outcome === 'already_active') {
      return NextResponse.json(
        { error: 'This email is already subscribed' },
        { status: 400 }
      );
    }

    if (result.outcome === 'reactivated') {
      if (result.error) {
        console.error('Reactivate subscriber error:', result.error);
        return NextResponse.json(
          { error: 'Failed to reactivate subscriber' },
          { status: 500 }
        );
      }

      return NextResponse.json({ subscriber: result.data, reactivated: true });
    }

    // Inserted a new subscriber
    if (result.error) {
      console.error('Add subscriber error:', result.error);
      return NextResponse.json(
        { error: 'Failed to add subscriber' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscriber: result.data });
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
