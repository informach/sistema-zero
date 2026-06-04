import { decodeJwt } from 'jose'
import { type NextRequest, NextResponse } from 'next/server'
import { isProd } from '@/lib/env'
import { refreshTokens } from '@/server/refresh'

const ACCESS_COOKIE = 'sz_member_access'
const REFRESH_COOKIE = 'sz_member_refresh'

/** Prefixos da área logada do aluno (gate real = layout do grupo `(app)`). A
 * HOME é a própria raiz `/` (sem rota `/home` — diferente da referência, que
 * era um monolito com landing na raiz). */
const PROTECTED_PREFIXES = ['/cursos', '/perfil', '/compras']

/**
 * Fast-path: bloqueia a área logada sem cookie de sessão (a checagem REAL de
 * assinatura acontece no layout via `getSession`) e RENOVA o access token
 * expirado ANTES do render — páginas/layouts são Server Components e NÃO podem
 * escrever cookies ("Cookies can only be modified in a Server Action or Route
 * Handler"); o proxy é o único lugar do caminho de página que pode. Também
 * aplica security headers em todas as respostas. (Convenção `proxy` do Next 16.)
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected =
    pathname === '/' ||
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!isProtected) return withSecurityHeaders(NextResponse.next())

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value
  if (!refresh) return withSecurityHeaders(redirectToLogin(req))

  // Access ainda válido → segue direto (caminho quente, sem rede).
  if (!isAccessExpired(req.cookies.get(ACCESS_COOKIE)?.value)) {
    return withSecurityHeaders(NextResponse.next())
  }

  // Access expirado → rotaciona AQUI (single-flight compartilhado com o BFF).
  const result = await refreshTokens(refresh)
  if (result === 'invalid') {
    // Sessão morta (refresh rejeitado) → limpa e manda logar de novo.
    const res = redirectToLogin(req)
    res.cookies.delete(ACCESS_COOKIE)
    res.cookies.delete(REFRESH_COOKIE)
    return withSecurityHeaders(res)
  }
  if (result === 'unavailable') {
    // Gateway/rede fora: degrada (páginas usam fallbacks) em vez de deslogar.
    return withSecurityHeaders(NextResponse.next())
  }

  // Tokens novos: reescreve o cookie da REQUEST (o render já os enxerga via
  // `cookies()`) e grava na RESPONSE (o browser persiste).
  req.cookies.set(ACCESS_COOKIE, result.accessToken)
  req.cookies.set(REFRESH_COOKIE, result.refreshToken)
  const res = NextResponse.next({ request: { headers: req.headers } })
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd(),
    path: '/',
    maxAge: result.refreshExpiresIn,
  }
  res.cookies.set(ACCESS_COOKIE, result.accessToken, base)
  res.cookies.set(REFRESH_COOKIE, result.refreshToken, base)
  return withSecurityHeaders(res)
}

/** Expirado (ou ilegível) com folga de 30s — evita 401 no meio do render. */
function isAccessExpired(token: string | undefined): boolean {
  if (!token) return true
  try {
    const { exp } = decodeJwt(token)
    return typeof exp !== 'number' || exp * 1000 <= Date.now() + 30_000
  } catch {
    return true
  }
}

function redirectToLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // O player de aulas embute vídeo de terceiros: allowlist estrita de frames
  // (YouTube nocookie + Vimeo). Sem `frame-src` os iframes seriam bloqueados.
  // `worker-src`: o pdf.js do livro 3D roda num Web Worker do próprio bundle
  // (explícito p/ não quebrar se um dia entrar default-src).
  res.headers.set(
    'Content-Security-Policy',
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; worker-src 'self' blob:; object-src 'none'",
  )
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
