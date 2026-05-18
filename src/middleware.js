import { NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/'];

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const token =
    request.cookies.get('auth_token')?.value ||
    request.cookies.get('token')?.value;

  // Allow public routes without token
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Redirect to login if no auth cookie and route is protected
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    // Match all routes except static files, API routes, and next internals
    '/((?!_next|api|public|favicon.ico).*)',
  ],
};
