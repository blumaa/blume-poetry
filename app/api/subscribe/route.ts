import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { upsertSubscriber } from '@/lib/subscribers';
import { z } from 'zod';
import { verifyOrigin } from '@/lib/csrf';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  // Optional so the compact sidebar form can stay a single field; leaving it
  // out means the subscriber gets new-poem emails, which is what the form
  // says it will do.
  notifyNewPoems: z.boolean().optional(),
});

export async function POST(request: Request) {
  const csrfError = verifyOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.subscriptions);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { email, notifyNewPoems = true } = subscribeSchema.parse(body);

    const supabase = createAdminClient();

    const result = await upsertSubscriber(supabase, email, notifyNewPoems);

    if (result.outcome === 'already_active') {
      return NextResponse.json(
        { error: 'This email is already subscribed' },
        { status: 400 }
      );
    }

    if (result.outcome === 'reactivated') {
      return NextResponse.json({ message: 'Successfully resubscribed!' });
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
