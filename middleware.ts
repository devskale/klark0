import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import nextConfig from './next.config';

const protectedRoutes = '/dashboard';
const basePath = nextConfig.basePath || '';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  // Adjust for basePath
  const adjustedPathname = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;

  const isProtectedRoute = adjustedPathname.startsWith(protectedRoutes);

  if (isProtectedRoute && !sessionCookie) {
    const signInUrl = new URL(`${basePath}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === "GET") {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString(),
        }),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: expiresInOneDay,
        path: '/',
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        const signInUrl = new URL(`${basePath}/sign-in`, request.url);
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
