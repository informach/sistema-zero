import { type NextRequest, NextResponse } from 'next/server'
import { canAccessSection, homeForRole, pathIsRoleRestricted } from '@/components/admin/nav'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/cookies'
import { isSameOriginRequest, requiresOriginCheck } from '@/lib/csrf'
import { sessionUserFromToken } from '@/server/session'

/**
 * Gate de borda do painel (convenção `proxy` do Next 16, ex-middleware):
 *  1. **Anti-CSRF (defesa em profundidade):** mutação em `/api/*` precisa ser
 *     same-origin — o `SameSite=Lax` dos cookies não barra um subdomínio IRMÃO
 *     (same-site) no domínio definitivo. (`/api/media/*` fica fora do matcher e
 *     tem a MESMA checagem dentro do `requireMediaSession`.)
 *  2. **Fast-path de UI:** bloqueia `/admin/*` sem cookie de sessão (a checagem
 *     REAL de assinatura/role acontece no layout do admin via `getSession`).
 *  3. **Gate por SEÇÃO da nav** (`canAccessSection`): quando o path pertence a
 *     uma seção com `roles` (hoje só Auditoria; os grupos ligam quando o papel
 *     `professor` nascer), verifica o papel do access JWT e redireciona o
 *     negado p/ a home da seção dele. É gate de UI — a autorização REAL de
 *     dados continua no gateway (RBAC por rota).
 *
 * Os **security headers** (XFO/CSP/HSTS/…) NÃO ficam mais aqui — migraram p/
 * `next.config.ts` (`headers()`), que cobre TODAS as respostas, inclusive
 * `/api/media/*` (que o matcher exclui). Aqui não embrulhamos respostas.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/') && requiresOriginCheck(req.method) && !isSameOrigin(req)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Origem não permitida.' } },
      { status: 403 },
    )
  }

  if (pathname.startsWith('/admin') && !req.cookies.has(REFRESH_COOKIE)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    // Preserva o destino p/ voltar após o login (`/admin` é o default do form —
    // só vale parametrizar destinos mais profundos; o login valida o valor).
    const dest = pathname + req.nextUrl.search
    if (dest !== '/admin') url.searchParams.set('next', dest)
    return NextResponse.redirect(url)
  }

  // Gate por seção — a verificação de JWT só roda em path restrito por papel.
  if (pathname.startsWith('/admin') && pathIsRoleRestricted(pathname)) {
    const access = req.cookies.get(ACCESS_COOKIE)?.value
    const user = access ? await sessionUserFromToken(access) : null
    if (!user || !canAccessSection(user.role, pathname)) {
      const url = req.nextUrl.clone()
      url.pathname = user ? homeForRole(user.role) : '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
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
  // `api/media` fica FORA do matcher: o proxy buffeia o corpo (limite ~10MB) e
  // estrangularia uploads multipart; essas rotas têm guard de sessão próprio
  // (com a mesma checagem anti-CSRF dentro do `requireMediaSession`).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/media).*)'],
}
