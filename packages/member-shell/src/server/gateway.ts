import 'server-only'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { headers } from 'next/headers'
import { getEnv } from '../lib/env'
import type { ImpersonationMode } from '../lib/types'
import {
  type ForwardHeaders,
  refreshTokens,
  replaceCachedAccessToken,
  withCurrentRefreshToken,
} from './refresh'
import type { AuthSessionAccessToken, AuthTokens, SessionModule } from './session'

// Tetos das chamadas de saída (upstream pendurado NÃO pode pendurar a request
// do aluno): dados via gateway cobrem a rota mais lenta com folga; auth
// (login/refresh/logout/OTP) é rápido por contrato. Espelha o admin.
const GATEWAY_TIMEOUT_MS = 60_000
const AUTH_TIMEOUT_MS = 15_000

export interface GatewayResponse<T = unknown> {
  retryAfter?: string
  status: number
  body: T
}

export interface CallOpts {
  signal?: AbortSignal
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  /**
   * Prazo PRÓPRIO desta chamada (padrão 60 s). Só para as rotas que esperam um trabalho longo do
   * outro lado: o "Verificar esta parte" com objetivos que RODAM o jogo (até ~150 s).
   */
  timeoutMs?: number
}

/** Módulo de chamadas ao gateway de um app (ver `createGatewayModule`). */
export type GatewayModule = ReturnType<typeof createGatewayModule>

/**
 * Prova de origem do aluno repassada ao gateway: sem o `x-forwarded-for`, o
 * rate limit por IP das rotas públicas (login 20/min, OTP 5/min!) e o log de
 * login falho do auth veriam SÓ o IP do host do app — um balde único para a
 * base inteira de alunos. O `x-request-id` amarra o rastreio ponta-a-ponta
 * (o gateway valida o formato). Espelha o admin. Sem cookie → export plano.
 */
export async function clientForwardHeaders(): Promise<ForwardHeaders> {
  try {
    const h = await headers()
    const out: ForwardHeaders = {}
    const xff = h.get('x-forwarded-for')
    if (xff) out['x-forwarded-for'] = xff
    const rid = h.get('x-request-id')
    if (rid) out['x-request-id'] = rid
    return out
  } catch {
    // Fora de request scope (defensivo) — segue sem os headers.
    return {}
  }
}

async function rawFetch(
  path: string,
  opts: CallOpts,
  access: string | null,
  signedConsumer = false,
): Promise<Response> {
  const env = getEnv()
  const url = new URL(path, env.GATEWAY_URL)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const reqHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...(await clientForwardHeaders()),
  }
  if (access) reqHeaders.authorization = `Bearer ${access}`
  const rawBody = opts.body === undefined ? '' : JSON.stringify(opts.body)
  if (signedConsumer) {
    if (!env.MEMBER_SHELL_HMAC_SECRET)
      return Response.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      env.MEMBER_SHELL_HMAC_SECRET,
      canonicalHmacMessage({ method: opts.method ?? 'GET', path: url.pathname, body: rawBody }),
      timestamp,
    )
    reqHeaders['x-consumer-id'] = 'member-shell'
    reqHeaders['x-signature'] = `t=${timestamp},v1=${signature}`
  }
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      headers: reqHeaders,
      body: opts.body !== undefined ? rawBody : undefined,
      cache: 'no-store',
      signal: AbortSignal.any([
        AbortSignal.timeout(opts.timeoutMs ?? GATEWAY_TIMEOUT_MS),
        ...(opts.signal ? [opts.signal] : []),
      ]),
    })
  } catch {
    // Timeout / conexão recusada / falha de DNS: NÃO rejeita (rejeição não tratada).
    // Degrada para um 503 SINTÉTICO — espelha o `publicAuthPost` — para o caller
    // cair no MESMO caminho de não-2xx. Sem isto, um soluço transitório do gateway
    // faz `getMeReadonly`/`gatewayFetchReadonly` LANÇAR no render de um Server
    // Component (layout/page) — que documenta degradar para o fallback de iniciais
    // — e derruba o shell inteiro (o app adulto não tem `error.tsx`).
    return new Response(
      JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' } }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    )
  }
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    return null as T
  }
}

/** POST público (sem Bearer) numa rota de auth do gateway — login/OTP/exchange. */
export async function publicAuthPost<T>(path: string, body: unknown): Promise<GatewayResponse<T>> {
  const env = getEnv()
  try {
    const res = await fetch(new URL(path, env.GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
    return {
      status: res.status,
      body: await readJson<T>(res),
      ...(res.headers.get('retry-after') ? { retryAfter: res.headers.get('retry-after')! } : {}),
    }
  } catch {
    return {
      status: 503,
      body: {
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' },
      } as T,
    }
  }
}

/**
 * Módulo de chamadas ao gateway parametrizado pelo módulo de SESSÃO do app (os
 * cookies de onde sai o Bearer e onde a rotação regrava os tokens).
 */
export function createGatewayModule(session: SessionModule) {
  async function authenticatedFetch(
    path: string,
    opts: CallOpts,
    access: string | null,
    readOnly = false,
    signedConsumer = false,
  ): Promise<Response> {
    if (session.audience === 'adult') {
      const verdict = access ? await session.verifyAccessTokenLocally(access) : null
      if (!verdict?.ok)
        return Response.json(
          {
            error: {
              code:
                verdict && !verdict.ok && verdict.unavailable ? 'AUTH_UNAVAILABLE' : 'UNAUTHORIZED',
            },
          },
          { status: verdict && !verdict.ok && verdict.unavailable ? 503 : 401 },
        )
    }
    if (session.audience === 'kids') {
      // ⚠️ Só a verificação LOCAL: o Gateway introspecta no Auth TODA chamada de sessão Kids
      // (sem cache), então a revogação continua imediata e indisponibilidade dele volta como
      // 503. Conferir aqui também dobrava as idas ao Auth por chamada. A prova da sessão do
      // documento (`x-sz-session`) continua sendo daqui: o Gateway não a conhece.
      const verdict = access ? await session.verifyAccessTokenLocally(access) : null
      if (!verdict?.ok) return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      const requestHeaders = await headers()
      const expected = requestHeaders.get('x-sz-session')
      if (
        verdict.user.kids &&
        ((expected && expected !== verdict.user.kids.sessionId) ||
          (!readOnly &&
            opts.method &&
            opts.method !== 'GET' &&
            expected !== verdict.user.kids.sessionId))
      ) {
        return Response.json(
          {
            error: { code: 'SESSION_CHANGED', message: 'O perfil mudou. Abra a página novamente.' },
          },
          { status: 409 },
        )
      }
    }
    return rawFetch(path, opts, access, signedConsumer)
  }
  /**
   * Rotação de tokens (gateway → auth /refresh) via `refreshTokens` (single-flight
   * em `globalThis` — compartilha a rotação com o proxy e com chamadas
   * concorrentes). Regrava os cookies quando possível; em Server Component a
   * escrita LANÇA ("Cookies can only be modified in a Server Action or Route
   * Handler") → engole e segue com o token novo só nesta request (o cache do
   * single-flight garante que a PRÓXIMA request, ainda com o cookie antigo,
   * receba os MESMOS tokens — sem revogar a família).
   */
  async function tryRefresh(): Promise<string | null> {
    const refreshToken = await session.getRefreshToken()
    if (!refreshToken) return null
    const result = await refreshTokens(refreshToken, await clientForwardHeaders())
    if (result === 'unavailable') return null
    if (result === 'invalid') {
      try {
        await session.clearSessionCookies()
      } catch {
        // Server Component: sem escrita de cookie — o proxy limpa na próxima request.
      }
      return null
    }
    try {
      await session.setSessionCookies(result)
    } catch {
      // Server Component: idem — o proxy persiste os cookies na próxima request.
    }
    return result.accessToken
  }

  /**
   * Chamada autenticada ao gateway com o Bearer do cookie. Em 401, tenta UMA rotação
   * de token e re-tenta. SÓ pode ser usada em Route Handlers/Server Actions (escreve
   * cookies na rotação). Retorna `{status, body}` cru.
   */
  async function gatewayFetch<T = unknown>(
    path: string,
    opts: CallOpts = {},
  ): Promise<GatewayResponse<T>> {
    const access = await session.getAccessToken()
    let res = await authenticatedFetch(path, opts, access)
    if (res.status === 401) {
      const renewed = await tryRefresh()
      if (renewed) res = await authenticatedFetch(path, opts, renewed)
    }
    return {
      status: res.status,
      body: await readJson<T>(res),
      ...(res.headers.get('retry-after') ? { retryAfter: res.headers.get('retry-after')! } : {}),
    }
  }

  /** Student JWT plus the member-shell service proof on the exact same JSON body. */
  async function gatewayFetchDual<T = unknown>(
    path: string,
    opts: CallOpts,
  ): Promise<GatewayResponse<T>> {
    if (!getEnv().MEMBER_SHELL_HMAC_SECRET)
      return { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } as T }
    // Capture one immutable JSON value before either transport attempt or token refresh.
    const stable = opts.body === undefined ? undefined : JSON.parse(JSON.stringify(opts.body))
    const signedOpts = { ...opts, body: stable }
    const access = await session.getAccessToken()
    let res = await authenticatedFetch(path, signedOpts, access, false, true)
    if (res.status === 401) {
      const renewed = await tryRefresh()
      if (renewed) res = await authenticatedFetch(path, signedOpts, renewed, false, true)
    }
    return {
      status: res.status,
      body: await readJson<T>(res),
      ...(res.headers.get('retry-after') ? { retryAfter: res.headers.get('retry-after')! } : {}),
    }
  }

  /**
   * POST autenticado cujo corpo precisa levar o refresh CANÔNICO da mesma
   * sessão. Se o access expirar, a primeira tentativa libera o lock, rotaciona
   * e refaz corpo + chamada com o sucessor; nunca reapresenta o ancestral.
   */
  async function gatewayFetchWithRefreshProof<T = unknown>(
    path: string,
    refreshToken: string | null,
    body: Record<string, unknown>,
  ): Promise<GatewayResponse<T>> {
    if (!refreshToken) return gatewayFetch(path, { method: 'POST', body })
    const request = (access: string | null) =>
      withCurrentRefreshToken(refreshToken, (current) =>
        authenticatedFetch(
          path,
          { method: 'POST', body: { ...body, refreshToken: current } },
          access,
        ),
      )
    let res = await request(await session.getAccessToken())
    if (res.status === 401) {
      const renewed = await tryRefresh()
      if (renewed) res = await request(renewed)
    }
    return {
      status: res.status,
      body: await readJson<T>(res),
      ...(res.headers.get('retry-after') ? { retryAfter: res.headers.get('retry-after')! } : {}),
    }
  }

  /**
   * Variante SOMENTE-LEITURA p/ Server Components (layouts/pages): NÃO tenta refresh
   * nem toca cookies (o Next proíbe escrita fora de Route Handler/Server Action —
   * `cookies().set()` lança). Access expirado → devolve o 401 cru e o caller usa um
   * fallback; a rotação real acontece na próxima chamada `/api/*` do client.
   */
  async function gatewayFetchReadonly<T = unknown>(
    path: string,
    opts: CallOpts = {},
  ): Promise<GatewayResponse<T>> {
    const access = await session.getAccessToken()
    const res = await authenticatedFetch(path, opts, access, true)
    return {
      status: res.status,
      body: await readJson<T>(res),
      ...(res.headers.get('retry-after') ? { retryAfter: res.headers.get('retry-after')! } : {}),
    }
  }

  /**
   * Chamada S2S assinada pelo BFF. Não leva Bearer nem headers de identidade:
   * o ator faz parte do JSON coberto pelo HMAC e o gateway re-injeta apenas a
   * identidade autenticada do consumer `member-shell`.
   */
  async function gatewayFetchHmac<T = unknown>(
    path: string,
    opts: CallOpts = {},
  ): Promise<GatewayResponse<T>> {
    const env = getEnv()
    const secret = env.MEMBER_SHELL_HMAC_SECRET
    if (!secret) {
      return {
        status: 503,
        body: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Persistência do Zappy indisponível.' },
        } as T,
      }
    }
    const method = opts.method ?? 'GET'
    const url = new URL(path, env.GATEWAY_URL)
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value))
        }
      }
    }
    const rawBody = opts.body === undefined ? '' : JSON.stringify(opts.body)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      secret,
      canonicalHmacMessage({ method, path: url.pathname, body: rawBody }),
      timestamp,
    )
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': 'member-shell',
          'x-signature': `t=${timestamp},v1=${signature}`,
        },
        body: opts.body === undefined ? undefined : rawBody,
        cache: 'no-store',
        signal: AbortSignal.any([
          AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
          ...(opts.signal ? [opts.signal] : []),
        ]),
      })
      return { status: response.status, body: await readJson<T>(response) }
    } catch {
      return {
        status: 503,
        body: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' },
        } as T,
      }
    }
  }

  /** Login (rota pública do gateway → auth). NÃO leva Bearer. */
  function loginRequest(
    email: string,
    password: string,
  ): Promise<GatewayResponse<{ user?: { role: string }; tokens?: AuthTokens; error?: unknown }>> {
    return publicAuthPost('/auth/login', {
      email,
      password,
      ...(session.audience === 'kids' ? { platform: 'kids' } : {}),
    })
  }

  /** Login por OTP (rota pública do gateway → auth). Verifica o código e devolve tokens. */
  function verifyOtpRequest(
    email: string,
    code: string,
  ): Promise<GatewayResponse<{ user?: { role: string }; tokens?: AuthTokens; error?: unknown }>> {
    return publicAuthPost('/auth/otp/verify', {
      email,
      code,
      ...(session.audience === 'kids' ? { platform: 'kids' } : {}),
    })
  }

  /**
   * Exchange do token de HANDOFF de impersonação (rota pública do gateway → auth,
   * como o /login — sem Bearer). O token é single-use/60s; sucesso devolve a sessão
   * DO ALUNO-ALVO com claim `act` (admin navegando como ele) e refresh de TTL curto.
   * O token trafega no CORPO (não na URL desta chamada — não vaza em access log).
   */
  function exchangeImpersonation(
    token: string,
  ): Promise<GatewayResponse<{ user?: { id: string }; tokens?: AuthTokens; error?: unknown }>> {
    return publicAuthPost('/auth/impersonate/exchange', { token })
  }

  /** Rotaciona a sessão de suporte elevando/rebaixando sua capacidade explícita. */
  function changeImpersonationMode(
    refreshToken: string,
    mode: ImpersonationMode,
  ): Promise<GatewayResponse<{ tokens?: AuthSessionAccessToken; error?: unknown }>> {
    return withCurrentRefreshToken(refreshToken, async (current) => {
      const response = await publicAuthPost<{
        tokens?: AuthSessionAccessToken
        error?: unknown
      }>('/auth/impersonate/mode', { refreshToken: current, mode })
      if (response.status === 200 && response.body?.tokens) {
        await replaceCachedAccessToken(refreshToken, response.body.tokens)
      }
      return response
    })
  }

  /** Revoga o refresh no auth; o chamador decide se uma falha pode ser ignorada. */
  async function logoutRequest(refreshToken: string): Promise<boolean> {
    const response = await withCurrentRefreshToken(refreshToken, (current) =>
      publicAuthPost('/auth/logout', { refreshToken: current, allSessions: false }),
    )
    return response.status >= 200 && response.status < 300
  }

  return {
    tryRefresh,
    gatewayFetch,
    gatewayFetchDual,
    gatewayFetchWithRefreshProof,
    gatewayFetchReadonly,
    gatewayFetchHmac,
    loginRequest,
    verifyOtpRequest,
    exchangeImpersonation,
    changeImpersonationMode,
    logoutRequest,
  }
}
