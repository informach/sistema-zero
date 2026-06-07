import { decodeJwt } from 'jose'
import { type NextRequest, NextResponse } from 'next/server'
import { ACCESS_COOKIE, expireCookieOptions, REFRESH_COOKIE } from '@/lib/cookies'
import { isSameOriginRequest, requiresOriginCheck } from '@/lib/csrf'
import { isProd } from '@/lib/env'
import { refreshTokens } from '@/server/refresh'

/** Prefixos da área logada do aluno (gate real = layout do grupo `(app)`). A
 * HOME é a própria raiz `/` (sem rota `/home` — diferente da referência, que
 * era um monolito com landing na raiz). */
const PROTECTED_PREFIXES = ['/cursos', '/perfil', '/compras']

/**
 * Gate de borda da área do aluno (convenção `proxy` do Next 16):
 *  1. **Anti-CSRF (defesa em profundidade):** mutação em `/api/*` precisa ser
 *     same-origin — o `SameSite=Lax` dos cookies não barra um subdomínio IRMÃO
 *     (same-site) no domínio definitivo. (`/api/me/avatar` fica fora do matcher
 *     — o proxy buffeia o corpo e estrangularia o multipart — e tem a MESMA
 *     checagem dentro do `requireUploadSession`.)
 *  2. **Fast-path de UI:** bloqueia a área logada sem cookie de sessão (a
 *     checagem REAL de assinatura acontece no layout via `getSession`) e RENOVA
 *     o access token expirado ANTES do render — páginas/layouts são Server
 *     Components e NÃO podem escrever cookies; o proxy é o único lugar do
 *     caminho de página que pode.
 *
 * Os **security headers** (XFO/CSP/HSTS/…) NÃO ficam aqui — vivem em
 * `next.config.ts` (`headers()`), que cobre TODAS as respostas, inclusive as
 * fora deste matcher (espelha o admin).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/') && requiresOriginCheck(req.method) && !isSameOrigin(req)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Origem não permitida.' } },
      { status: 403 },
    )
  }

  const isProtected =
    pathname === '/' ||
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!isProtected) return NextResponse.next()

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value
  if (!refresh) return redirectToLogin(req)

  // Access ainda válido → segue direto (caminho quente, sem rede).
  if (!isAccessExpired(req.cookies.get(ACCESS_COOKIE)?.value)) {
    return NextResponse.next()
  }

  // Access expirado → rotaciona AQUI (single-flight em globalThis, compartilhado
  // com o BFF — bundles separados, mesmo processo). Propaga a prova de origem
  // (rate limit por IP + auditoria do auth enxergam o aluno, não o host).
  const result = await refreshTokens(refresh, forwardHeadersFrom(req))
  if (result === 'invalid') {
    // Sessão morta (refresh rejeitado) → limpa e manda logar de novo. A limpeza
    // usa `set('', maxAge: 0)` com os atributos da escrita — `delete()` pelado
    // (sem `Secure`) é REJEITADO pelo browser p/ `__Host-*` em prod e os cookies
    // mortos sobreviveriam (loop /login ⇄ / até expirarem).
    const res = redirectToLogin(req)
    res.cookies.set(ACCESS_COOKIE, '', expireCookieOptions(isProd()))
    res.cookies.set(REFRESH_COOKIE, '', expireCookieOptions(isProd()))
    return res
  }
  if (result === 'unavailable') {
    // Gateway/rede fora: degrada (páginas usam fallbacks) em vez de deslogar.
    return NextResponse.next()
  }

  // Tokens novos: reescreve o cookie da REQUEST (o render já os enxerga via
  // `cookies()`) e grava na RESPONSE (o browser persiste).
  req.cookies.set(ACCESS_COOKIE, result.accessToken)
  req.cookies.set(REFRESH_COOKIE, result.refreshToken)
  const res = NextResponse.next({ request: { headers: req.headers } })
  // `__Host-` (prod) exige Secure + Path=/ + sem Domain — este `base` cumpre.
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd(),
    path: '/',
    maxAge: result.refreshExpiresIn,
  }
  res.cookies.set(ACCESS_COOKIE, result.accessToken, base)
  res.cookies.set(REFRESH_COOKIE, result.refreshToken, base)
  return res
}

/** Same-origin por `Sec-Fetch-Site` (não-forjável) com fallback de `Origin`×host. */
function isSameOrigin(req: NextRequest): boolean {
  return isSameOriginRequest({
    secFetchSite: req.headers.get('sec-fetch-site'),
    origin: req.headers.get('origin'),
    host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
  })
}

/** Prova de origem repassada ao gateway no refresh (`x-forwarded-for`/`x-request-id`). */
function forwardHeadersFrom(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  const xff = req.headers.get('x-forwarded-for')
  if (xff) out['x-forwarded-for'] = xff
  const rid = req.headers.get('x-request-id')
  if (rid) out['x-request-id'] = rid
  return out
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

export const config = {
  // `api/me/avatar` fica FORA do matcher: o proxy buffeia o corpo (limite ~10MB)
  // e copiaria o multipart à toa; a rota tem guard próprio (sessão estrita + a
  // MESMA checagem anti-CSRF dentro do `requireUploadSession`).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/me/avatar).*)'],
}
