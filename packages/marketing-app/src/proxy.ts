import { type NextRequest, NextResponse } from 'next/server'
import { REFRESH_COOKIE } from '@/lib/cookies'
import { isSameOriginRequest, requiresOriginCheck } from '@/lib/csrf'

/**
 * Gate de borda do app (convenção `proxy` do Next 16, ex-middleware):
 *  1. **Anti-CSRF (defesa em profundidade):** mutação em `/api/*` precisa ser
 *     same-origin — o `SameSite=Lax` dos cookies não barra um subdomínio IRMÃO
 *     (same-site) no domínio definitivo.
 *  2. **Fast-path de UI:** bloqueia as páginas autenticadas (grupo `(app)`: `/`,
 *     `/pipeline`, `/calendario`, …) sem cookie de sessão (a checagem REAL de
 *     assinatura/role acontece no layout do grupo via `getSession`).
 *
 * Os **security headers** (XFO/CSP/HSTS/…) NÃO ficam aqui — vivem no
 * `next.config.ts` (`headers()`), que cobre TODAS as respostas. Aqui não
 * embrulhamos respostas.
 */

// Prefixos das páginas do grupo autenticado `(app)` (o grupo não aparece na URL).
const APP_PREFIXES = [
  '/pipeline',
  '/calendario',
  '/ideias',
  '/midia',
  '/metricas',
  '/conexoes',
  '/conteudos',
]

function isAppPath(pathname: string): boolean {
  if (pathname === '/') return true
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/') && requiresOriginCheck(req.method) && !isSameOrigin(req)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Origem não permitida.' } },
      { status: 403 },
    )
  }

  if (isAppPath(pathname) && !req.cookies.has(REFRESH_COOKIE)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    // Preserva o destino p/ voltar após o login (`/` é o default do form —
    // só vale parametrizar destinos mais profundos; o login valida o valor).
    const dest = pathname + req.nextUrl.search
    if (dest !== '/') url.searchParams.set('next', dest)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

function isSameOrigin(req: NextRequest): boolean {
  return isSameOriginRequest({
    secFetchSite: req.headers.get('sec-fetch-site'),
    origin: req.headers.get('origin'),
    host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
  })
}

export const config = {
  // Cobre as páginas autenticadas + `/api/*` (anti-CSRF). Estáticos do Next e o
  // favicon ficam fora (mesmo matcher do admin, sem a exceção de api/media —
  // aqui não há upload passando pelo BFF: a mídia sobe direto p/ o R2).
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
