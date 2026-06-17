import { decodeJwt } from 'jose'
import { type NextRequest, NextResponse } from 'next/server'
import { expireCookieOptions, type SessionCookieNames } from '../lib/cookies'
import { isSameOriginRequest, requiresOriginCheck } from '../lib/csrf'
import { isProd } from '../lib/env'
import { refreshTokens } from './refresh'

export interface MemberProxyConfig {
  /** Nomes dos cookies de sessão do app (mesmos do `createShell`). */
  cookies: SessionCookieNames
  /** Prefixos da área logada (ex.: `['/cursos', '/perfil', '/compras']`). */
  protectedPrefixes: string[]
  /** A raiz `/` exige sessão? (home dos apps de aluno é a própria raiz). */
  isRootProtected: boolean
  /**
   * Gate de PERFIL (estilo Netflix — só o kids usa). Quando setado (ex.: `/perfis`),
   * uma sessão da CONTA (sem a claim `pfl`) acessando a área de aprender é
   * redirecionada para ESTA rota (escolher um perfil); a própria rota e suas
   * subrotas são isentas. Ausente = sem gate (community adulto).
   */
  requireProfileSelectPath?: string
}

/**
 * Gate de borda da área do aluno (convenção `proxy` do Next 16), parametrizado
 * por app. ⚠️ O `export const config = { matcher }` fica no `proxy.ts` de CADA
 * app (precisa ser literal estaticamente analisável pelo Next) — aqui vive só a
 * função.
 *
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
 * Os **security headers** (XFO/CSP/HSTS/…) NÃO ficam aqui — vivem no
 * `next.config.ts` de cada app (`headers()`), que cobre TODAS as respostas,
 * inclusive as fora do matcher (espelha o admin).
 */
export function createMemberProxy(cfg: MemberProxyConfig) {
  const { accessCookie, refreshCookie } = cfg.cookies

  return async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl

    if (pathname.startsWith('/api/') && requiresOriginCheck(req.method) && !isSameOrigin(req)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Origem não permitida.' } },
        { status: 403 },
      )
    }

    const isProtected =
      (cfg.isRootProtected && pathname === '/') ||
      cfg.protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    if (!isProtected) return NextResponse.next()

    const refresh = req.cookies.get(refreshCookie)?.value
    if (!refresh) return redirectToLogin(req)

    const currentAccess = req.cookies.get(accessCookie)?.value
    // O token VÁLIDO após esta etapa (do cookie ou recém-rotacionado) — alimenta o
    // gate de perfil abaixo.
    let validAccess = currentAccess
    let response = NextResponse.next()

    // Access expirado → rotaciona AQUI (single-flight em globalThis, compartilhado
    // com o BFF — bundles separados, mesmo processo). Propaga a prova de origem
    // (rate limit por IP + auditoria do auth enxergam o aluno, não o host).
    if (isAccessExpired(currentAccess)) {
      const result = await refreshTokens(refresh, forwardHeadersFrom(req))
      if (result === 'invalid') {
        // Sessão morta (refresh rejeitado) → limpa e manda logar de novo. A limpeza
        // usa `set('', maxAge: 0)` com os atributos da escrita — `delete()` pelado
        // (sem `Secure`) é REJEITADO pelo browser p/ `__Host-*` em prod e os cookies
        // mortos sobreviveriam (loop /login ⇄ / até expirarem).
        const res = redirectToLogin(req)
        res.cookies.set(accessCookie, '', expireCookieOptions(isProd()))
        res.cookies.set(refreshCookie, '', expireCookieOptions(isProd()))
        return res
      }
      // Gateway/rede fora: degrada (páginas usam fallbacks) em vez de deslogar.
      if (result === 'unavailable') return NextResponse.next()

      // Tokens novos: reescreve o cookie da REQUEST (o render já os enxerga via
      // `cookies()`) e grava na RESPONSE (o browser persiste).
      req.cookies.set(accessCookie, result.accessToken)
      req.cookies.set(refreshCookie, result.refreshToken)
      validAccess = result.accessToken
      response = NextResponse.next({ request: { headers: req.headers } })
      // `__Host-` (prod) exige Secure + Path=/ + sem Domain — este `base` cumpre.
      const base = {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: isProd(),
        path: '/',
        maxAge: result.refreshExpiresIn,
      }
      response.cookies.set(accessCookie, result.accessToken, base)
      response.cookies.set(refreshCookie, result.refreshToken, base)
    }

    // Gate de PERFIL (kids): a conta logada SEM perfil selecionado (token sem a
    // claim `pfl`) acessando a área de aprender → vai escolher um perfil. A rota de
    // seleção e suas subrotas são isentas (e o `/api/*` segue livre — não é página).
    if (
      cfg.requireProfileSelectPath &&
      !pathname.startsWith('/api/') &&
      !pathname.startsWith(cfg.requireProfileSelectPath) &&
      !hasProfileClaim(validAccess)
    ) {
      const url = req.nextUrl.clone()
      url.pathname = cfg.requireProfileSelectPath
      return NextResponse.redirect(url)
    }

    return response
  }
}

/** A sessão tem a claim `pfl` (sessão de perfil ativo)? Lê o JWT sem verificar (já validado). */
function hasProfileClaim(token: string | undefined): boolean {
  if (!token) return false
  try {
    const pfl = decodeJwt(token).pfl
    return (
      typeof pfl === 'object' &&
      pfl !== null &&
      typeof (pfl as Record<string, unknown>).accountId === 'string'
    )
  } catch {
    return false
  }
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
