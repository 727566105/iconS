import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Authentication middleware for admin routes
 * Note: This middleware only validates that the session cookie exists.
 * Full session validation happens in the page/API route handlers.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Allow /admin/login page
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    // Check if session cookie exists
    const sessionId = request.cookies.get('sessionId')

    if (!sessionId) {
      // Redirect to login page
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

/**
 * Configure matcher for middleware
 */
export const config = {
  matcher: ['/admin/:path*'],
}
