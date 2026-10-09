import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasAdminRole } from '@/lib/adminRole';

/**
 * Refreshes the Supabase session on the routes that read it, and sends people
 * to the right side of the login page. This is the fast, optimistic check:
 * the data itself stays guarded by requireAdmin and row level security.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Must run before the response is returned so refreshed session cookies
  // can still be written onto it.
  const { data } = await supabase.auth.getClaims();
  const isAdmin = hasAdminRole(data?.claims);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && !isAdmin) return redirectTo('/login', request, response);
  if (pathname === '/login' && isAdmin) return redirectTo('/admin', request, response);

  return response;
}

/** A redirect that keeps any session cookies refreshed above. */
function redirectTo(path: string, request: NextRequest, refreshed: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  refreshed.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/api/admin/:path*', '/api/push/:path*'],
};
