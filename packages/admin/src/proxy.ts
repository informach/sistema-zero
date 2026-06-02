import { type NextRequest, NextResponse } from 'next/server'

const REFRESH_COOKIE = 'sz_admin_refresh'

/**
 * Fast-path: bloqueia `/admin/*` sem cookie de sessão (a checagem REAL de
 * assinatura/role acontece no layout do admin via `getSession`). Também aplica
 * security headers em todas as respostas. (Convenção `proxy` do Next 16, ex-middleware.)
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/admin') && !req.cookies.has(REFRESH_COOKIE)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return withSecurityHeaders(NextResponse.redirect(url))
  }
  return withSecurityHeaders(NextResponse.next())
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
