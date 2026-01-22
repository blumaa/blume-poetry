import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: Find poems with truncated content, or get poem by slug
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const supabase = createAdminClient();

  // If slug provided, return full poem content
  if (slug) {
    const { data, error } = await supabase
      .from('poems')
      .select('id, title, slug, content, plain_text')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching poem:', error);
      return NextResponse.json({ error: 'Failed to fetch poem' }, { status: 500 });
    }

    return NextResponse.json({ poem: data });
  }

  // Otherwise, find truncated poems
  const { data, error } = await supabase
    .from('poems')
    .select('id, title, slug, content, plain_text')
    .or('content.ilike.%truncated%,plain_text.ilike.%truncated%');

  if (error) {
    console.error('Error finding truncated poems:', error);
    return NextResponse.json({ error: 'Failed to find truncated poems' }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length || 0,
    poems: data?.map(p => ({ id: p.id, title: p.title, slug: p.slug })) || []
  });
}

const updateSchema = z.object({
  slug: z.string(),
  content: z.string(),
  plain_text: z.string(),
});

// POST: Update a poem's content
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, content, plain_text } = updateSchema.parse(body);

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('poems')
      .update({ content, plain_text })
      .eq('slug', slug)
      .select('id, title, slug')
      .single();

    if (error) {
      console.error('Error updating poem:', error);
      return NextResponse.json({ error: 'Failed to update poem' }, { status: 500 });
    }

    return NextResponse.json({ success: true, poem: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }

    console.error('Update poem error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
