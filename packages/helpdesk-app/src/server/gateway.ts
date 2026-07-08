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
// dados via gateway com folga; auth (login/refresh/logout) é rápido por contrato.
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
 * host do app (um balde único p/ toda a equipe). O `x-request-id` amarra o
 * rastreio ponta-a-ponta (o gateway valida o formato).
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

// Single-flight da rotação: chamadas PARALELAS com o mesmo refresh token (ex.:
// `Promise.all` no BFF, fetches concorrentes do painel) compartilham UMA
// rotação. Sem isso, a segunda rotação perde o claim atômico do auth, recebe
// !ok e limparia os cookies que a primeira acabou de regravar → logout aleatório.
//
// ⚠️ O estado vive em **`globalThis`**, NÃO em escopo de módulo: o Turbopack
// separa route handlers (e o proxy) em BUNDLES distintos com cópias próprias do
// módulo — um Map de módulo daria uma rotação concorrente POR bundle, mesmo num
// único processo, reabrindo o logout aleatório (lição verificada no community).
// Os bundles dividem o processo, então o `globalThis` é o ponto de encontro.
//
// ⚠️ Mesmo assim o single-flight é POR PROCESSO → cobre só UMA réplica. O app
// roda em **réplica única** (default do Railway; a equipe é pequena) — NÃO
// escale sem antes mover isto p/ um store compartilhado ou dar ao auth uma
// janela de reuso do refresh. (Mesma regra do admin.)
const refreshGlobal = globalThis as typeof globalThis & {
  __szHdInflightRefresh?: Map<string, Promise<string | null>>
}
refreshGlobal.__szHdInflightRefresh ??= new Map()
const inflightRefresh = refreshGlobal.__szHdInflightRefresh

/**
 * Rotação de tokens (gateway → auth /refresh), com single-flight por refresh
 * token. Regrava os cookies; `null` se falhar. Falha de REDE não limpa cookies
 * (transitória); recusa do auth (401/409) limpa — o refresh já não vale.
 */
export async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  const existing = inflightRefresh.get(refreshToken)
  if (existing) return existing
  const attempt = rotateTokens(refreshToken).finally(() => {
    inflightRefresh.delete(refreshToken)
  })
  inflightRefresh.set(refreshToken, attempt)
  return attempt
}

async function rotateTokens(refreshToken: string): Promise<string | null> {
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
    return null // rede/timeout: não derruba a sessão por falha transitória
  }
  if (!res.ok) {
    await clearSessionCookies()
    return null
  }
  const data = await readJson<{ tokens?: AuthTokens }>(res)
  if (!data?.tokens?.accessToken) {
    await clearSessionCookies()
    return null
  }
  await setSessionCookies(data.tokens)
  return data.tokens.accessToken
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
