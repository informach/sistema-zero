import { type NextRequest, NextResponse } from 'next/server'

const REFRESH_COOKIE = 'sz_member_refresh'

/** Prefixos da área logada do aluno (gate real = layout do grupo `(app)`). */
const PROTECTED_PREFIXES = ['/home', '/cursos', '/perfil', '/compras']

/**
 * Fast-path: bloqueia a área logada sem cookie de sessão (a checagem REAL de
 * assinatura acontece no layout via `getSession`). Também aplica security
 * headers em todas as respostas. (Convenção `proxy` do Next 16, ex-middleware.)
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (isProtected && !req.cookies.has(REFRESH_COOKIE)) {
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
  // O player de aulas embute vídeo de terceiros: allowlist estrita de frames
  // (YouTube nocookie + Vimeo). Sem `frame-src` os iframes seriam bloqueados.
  res.headers.set(
    'Content-Security-Policy',
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'",
  )
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
