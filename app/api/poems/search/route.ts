import { NextRequest, NextResponse } from 'next/server';
import { searchPoems } from '@/lib/poems';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';

  if (!query.trim()) {
    return NextResponse.json({ poems: [] });
  }

  const poems = await searchPoems(query);
  return NextResponse.json({ poems });
}
