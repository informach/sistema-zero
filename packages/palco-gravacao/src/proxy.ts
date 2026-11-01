import { isSameOriginRequest, requiresOriginCheck } from '@sistemazero/member-shell/lib/csrf'
import { type NextRequest, NextResponse } from 'next/server'
import { setSessionCookies } from './server/cookies'
import { refresh } from './server/gateway'
import { ACCESS_COOKIE, REFRESH_COOKIE, verifyAccess } from './server/session'

/**
 * O palco é só da equipe: toda página e toda rota pedem a sessão de uma conta da equipe, menos
 * a entrada e o healthcheck. Um token vencido é renovado aqui, uma vez, e segue com o novo
 * (as páginas leem o cookie do pedido, então o novo vai também no pedido).
 */
const PUBLIC = ['/entrar', '/api/entrar', '/api/healthz']

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl
  // Guard even the public login: cross-site forms must never replace the staff session.
  if (
    requiresOriginCheck(req.method) &&
    !isSameOriginRequest({
      secFetchSite: req.headers.get('sec-fetch-site'),
      origin: req.headers.get('origin'),
      host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
    })
  )
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Abra o palco para continuar.' } },
      { status: 403 },
    )
  if (PUBLIC.includes(pathname)) return NextResponse.next()
  const verdict = await verifyAccess(req.cookies.get(ACCESS_COOKIE)?.value)
  if (verdict.ok) return NextResponse.next()
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  if (verdict.expired && refreshToken) {
    const tokens = await refresh(refreshToken)
    if (typeof tokens === 'object' && (await verifyAccess(tokens.accessToken)).ok) {
      req.cookies.set(ACCESS_COOKIE, tokens.accessToken)
      req.cookies.set(REFRESH_COOKIE, tokens.refreshToken)
      const res = NextResponse.next({ request: { headers: req.headers } })
      setSessionCookies(res, tokens)
      return res
    }
  }
  if (pathname.startsWith('/api/'))
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Entre de novo com a conta da equipe.' } },
      { status: 401 },
    )
  const entrar = new URL('/entrar', req.url)
  entrar.searchParams.set('volta', `${pathname}${search}`)
  return NextResponse.redirect(entrar)
}

export const config = {
  matcher: [
    '/((?!_next/|favicon|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|mp3|wav|glb|riv|wasm|json|woff2?)$).*)',
  ],
}
