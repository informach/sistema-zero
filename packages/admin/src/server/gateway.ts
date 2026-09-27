import 'server-only'
import { headers } from 'next/headers'
import { getEnv } from '@/lib/env'
import {
  type AuthTokens,
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from './session'

// Tetos das chamadas de saída (upstream pendurado NÃO pode pendurar o handler):
// dados via gateway cobrem a rota mais lenta (refund/criação Efí fria ~35s) com
// folga; auth (login/refresh/logout) é rápido por contrato.
const GATEWAY_TIMEOUT_MS = 60_000
const AUTH_TIMEOUT_MS = 15_000

export interface GatewayResponse<T = unknown> {
  status: number
  body: T
}

export interface CallOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
}

/**
 * Prova de origem do cliente repassada ao gateway: sem o `x-forwarded-for`, o
 * rate limit por IP do gateway e o log de login falho do auth veriam SÓ o IP do
 * host do admin (um balde único p/ todos os operadores). O `x-request-id` amarra
 * o rastreio ponta-a-ponta (o gateway valida o formato).
 */
async function clientForwardHeaders(): Promise<Record<string, string>> {
  try {
    const h = await headers()
    const out: Record<string, string> = {}
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

async function rawFetch(path: string, opts: CallOpts, access: string | null): Promise<Response> {
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
  return fetch(url, {
    method: opts.method ?? 'GET',
    headers: reqHeaders,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
  })
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    return null as T
  }
}

// Requisições que saíram do navegador com o mesmo cookie podem chegar ao refresh
// depois de a primeira rotação terminar. O resultado precisa sobreviver por um
// curto intervalo; guardar só a Promise pendente reapresenta o token consumido ao
// auth, que revoga a família inteira por detecção de reuso.
//
// ⚠️ O estado vive em **`globalThis`**, NÃO em escopo de módulo: o Turbopack
// separa route handlers (e, se um dia o proxy/RSC rotacionar, esses também) em
// BUNDLES distintos com cópias próprias do módulo — um Map de módulo daria uma
// rotação concorrente POR bundle, mesmo num único processo, reabrindo o logout
// aleatório (lição verificada no community). Os bundles dividem o processo, então
// o `globalThis` é o ponto de encontro.
//
// ⚠️ Mesmo assim o single-flight é POR PROCESSO → cobre só UMA réplica. O painel
// roda em **réplica única** (default do Railway; 2-3 operadores não exigem escala
// horizontal) — NÃO escale sem antes mover isto p/ um store compartilhado ou dar
// ao auth uma janela de reuso do refresh. (Ver CLAUDE.md §Deploy.)
const refreshGlobal = globalThis as typeof globalThis & {
  __szAdminRefreshResults?: Map<string, { at: number; promise: Promise<RefreshResult> }>
}
refreshGlobal.__szAdminRefreshResults ??= new Map()
const refreshResults = refreshGlobal.__szAdminRefreshResults
const REFRESH_RESULT_TTL_MS = 60_000
type RefreshResult = AuthTokens | 'invalid' | 'unavailable'

/**
 * Rotação de tokens (gateway → auth /refresh), com resultado compartilhado por
 * refresh token. Cada request grava os cookies na PRÓPRIA resposta, inclusive
 * quando recebeu um resultado já concluído. Falha transitória não limpa cookies.
 */
export async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  const now = Date.now()
  for (const [token, entry] of refreshResults) {
    if (now - entry.at >= REFRESH_RESULT_TTL_MS) refreshResults.delete(token)
  }
  let entry = refreshResults.get(refreshToken)
  if (!entry) {
    entry = { at: now, promise: rotateTokens(refreshToken) }
    refreshResults.set(refreshToken, entry)
  }
  const result = await entry.promise
  if (result === 'unavailable') {
    if (refreshResults.get(refreshToken) === entry) refreshResults.delete(refreshToken)
    return null
  }
  if (result === 'invalid') {
    await clearSessionCookies()
    return null
  }
  await setSessionCookies(result)
  return result.accessToken
}

async function rotateTokens(refreshToken: string): Promise<RefreshResult> {
  const env = getEnv()
  let res: Response
  try {
    res = await fetch(new URL('/auth/refresh', env.GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
  } catch {
    return 'unavailable' // rede/timeout: não derruba a sessão por falha transitória
  }
  if (!res.ok) return res.status >= 500 ? 'unavailable' : 'invalid'
  const data = await readJson<{ tokens?: AuthTokens }>(res)
  return data?.tokens?.accessToken && data.tokens.refreshToken ? data.tokens : 'invalid'
}

/**
 * Chamada autenticada ao gateway com o Bearer do cookie. Em 401, tenta UMA rotação
 * de token e re-tenta. SÓ pode ser usada em Route Handlers/Server Actions (escreve
 * cookies na rotação). Retorna `{status, body}` cru.
 */
export async function gatewayFetch<T = unknown>(
  path: string,
  opts: CallOpts = {},
): Promise<GatewayResponse<T>> {
  const access = await getAccessToken()
  let res = await rawFetch(path, opts, access)
  if (res.status === 401) {
    const renewed = await tryRefresh()
    if (renewed) res = await rawFetch(path, opts, renewed)
  }
  return { status: res.status, body: await readJson<T>(res) }
}

/**
 * Variante BINÁRIA do `gatewayFetch`: mesmo Bearer/refresh-on-401/timeout, mas
 * devolve a `Response` CRUA — o corpo NÃO é materializado aqui, permitindo
 * streaming pass-through (ex.: PDF da NFS-e). Mesmas restrições de uso (Route
 * Handlers/Server Actions — a rotação escreve cookies).
 */
export async function gatewayFetchRaw(path: string, opts: CallOpts = {}): Promise<Response> {
  const access = await getAccessToken()
  let res = await rawFetch(path, opts, access)
  if (res.status === 401) {
    const renewed = await tryRefresh()
    if (renewed) res = await rawFetch(path, opts, renewed)
  }
  return res
}

/** Login (rota pública do gateway → auth). NÃO leva Bearer. */
export async function loginRequest(
  email: string,
  password: string,
): Promise<GatewayResponse<{ user?: { role: string }; tokens?: AuthTokens; error?: unknown }>> {
  const env = getEnv()
  const res = await fetch(new URL('/auth/login', env.GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
  })
  return { status: res.status, body: await readJson(res) }
}

/** Logout (revoga o refresh no auth). Best-effort. */
export async function logoutRequest(refreshToken: string): Promise<void> {
  const env = getEnv()
  try {
    await fetch(new URL('/auth/logout', env.GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify({ refreshToken, allSessions: false }),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
  } catch {
    // best-effort; os cookies são limpos de qualquer forma
  }
}
