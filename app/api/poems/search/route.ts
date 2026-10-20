import { NextRequest, NextResponse } from 'next/server';
import { searchPoems } from '@/lib/poems';
import { isPoemCollection } from '@/lib/collections';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const MAX_QUERY_LENGTH = 100;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);
  const collection = params.get('collection') || 'main';

  if (!isPoemCollection(collection)) {
    return NextResponse.json({ error: 'Unknown collection' }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ poems: [] });
  }

  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.search);
  if (rateLimitError) return rateLimitError;

  const poems = await searchPoems(collection, query);
  return NextResponse.json({ poems });
}
