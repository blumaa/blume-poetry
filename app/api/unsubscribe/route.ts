import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const unsubscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = unsubscribeSchema.parse(body);

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('subscribers')
      .update({ status: 'unsubscribed' })
      .eq('email', email);

    if (error) {
      console.error('Unsubscribe error:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Successfully unsubscribed' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Unsubscribe error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Also support GET for unsubscribe links
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  await supabase
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('email', email);

  // Redirect to the unsubscribe confirmation page
  return NextResponse.redirect(new URL('/unsubscribe', request.url));
}
