import { createClient } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const client = createClient(request);
  if (!client.supabase) {
    return client.response;
  }
  const supabase = client.supabase;
  const response = client.response;
  const { data: { user } } = await supabase.auth.getUser();

  async function getUserLandingPath() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user?.id)
      .maybeSingle();

    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (profile?.role === 'platform_admin' || profile?.role === 'group_admin') {
      return '/admin';
    }

    if (profile?.role === 'driver' || driverProfile) {
      return '/dashboard/driver';
    }

    return '/dashboard/member';
  }

  async function isAdminUser() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user?.id)
      .maybeSingle();

    return profile?.role === 'platform_admin' || profile?.role === 'group_admin';
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/messages',
    '/notifications',
    '/settings',
    '/payment',
    '/payments',
    '/rate',
    '/report',
    '/match-check',
    '/trip-share',
    '/admin',
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const adminAllowed = await isAdminUser();
    if (!adminAllowed) {
      return NextResponse.redirect(new URL(await getUserLandingPath(), request.url));
    }
  }

  // Redirect to dashboard if accessing login/register while authenticated
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
    return NextResponse.redirect(new URL(await getUserLandingPath(), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
