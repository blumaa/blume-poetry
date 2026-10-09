import { NextRequest, NextResponse } from 'next/server';
import { searchPoems } from '@/lib/poems';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const MAX_QUERY_LENGTH = 100;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);

  if (!query) {
    return NextResponse.json({ poems: [] });
  }

  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.search);
  if (rateLimitError) return rateLimitError;

  const poems = await searchPoems(query);
  return NextResponse.json({ poems });
}
