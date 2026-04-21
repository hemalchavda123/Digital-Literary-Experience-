import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/signup2', '/signup', '/login', '/forgot-password', '/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes (exact or prefix match)
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like .ico, .png, etc.
  ) {
    return NextResponse.next()
  }

  // Check for JWT access token in cookies
  const accessToken = request.cookies.get('accessToken')?.value

  if (!accessToken) {
    // No token — redirect to signup/login page
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/signup2'
    return NextResponse.redirect(redirectUrl)
  }

  // Token exists — allow the request through with cache control headers
  // Add cache control headers to prevent browser caching of protected pages
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
