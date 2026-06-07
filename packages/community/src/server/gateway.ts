import 'server-only'
import { headers } from 'next/headers'
import { getEnv } from '@/lib/env'
import { type ForwardHeaders, refreshTokens } from './refresh'
import {
  type AuthTokens,
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from './session'

// Tetos das chamadas de saída (upstream pendurado NÃO pode pendurar a request
// do aluno): dados via gateway cobrem a rota mais lenta com folga; auth
// (login/refresh/logout/OTP) é rápido por contrato. Espelha o admin.
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
 * Prova de origem do aluno repassada ao gateway: sem o `x-forwarded-for`, o
 * rate limit por IP das rotas públicas (login 20/min, OTP 5/min!) e o log de
 * login falho do auth veriam SÓ o IP do host do community — um balde único
 * para a base inteira de alunos. O `x-request-id` amarra o rastreio
 * ponta-a-ponta (o gateway valida o formato). Espelha o admin.
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

/**
 * Rotação de tokens (gateway → auth /refresh) via `refreshTokens` (single-flight
 * em `globalThis` — compartilha a rotação com o proxy e com chamadas
 * concorrentes). Regrava os cookies quando possível; em Server Component a
 * escrita LANÇA ("Cookies can only be modified in a Server Action or Route
 * Handler") → engole e segue com o token novo só nesta request (o cache do
 * single-flight garante que a PRÓXIMA request, ainda com o cookie antigo,
 * receba os MESMOS tokens — sem revogar a família).
 */
export async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  const result = await refreshTokens(refreshToken, await clientForwardHeaders())
  if (result === 'unavailable') return null
  if (result === 'invalid') {
    try {
      await clearSessionCookies()
    } catch {
      // Server Component: sem escrita de cookie — o proxy limpa na próxima request.
    }
    return null
  }
  try {
    await setSessionCookies(result)
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
 * Variante SOMENTE-LEITURA p/ Server Components (layouts/pages): NÃO tenta refresh
 * nem toca cookies (o Next proíbe escrita fora de Route Handler/Server Action —
 * `cookies().set()` lança). Access expirado → devolve o 401 cru e o caller usa um
 * fallback; a rotação real acontece na próxima chamada `/api/*` do client.
 */
export async function gatewayFetchReadonly<T = unknown>(
  path: string,
  opts: CallOpts = {},
): Promise<GatewayResponse<T>> {
  const access = await getAccessToken()
  const res = await rawFetch(path, opts, access)
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

/** Login por OTP (rota pública do gateway → auth). Verifica o código e devolve tokens. */
export async function verifyOtpRequest(
  email: string,
  code: string,
): Promise<GatewayResponse<{ user?: { role: string }; tokens?: AuthTokens; error?: unknown }>> {
  const env = getEnv()
  const res = await fetch(new URL('/auth/otp/verify', env.GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
    body: JSON.stringify({ email, code }),
    cache: 'no-store',
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
  })
  return { status: res.status, body: await readJson(res) }
}

/**
 * Exchange do token de HANDOFF de impersonação (rota pública do gateway → auth,
 * como o /login — sem Bearer). O token é single-use/60s; sucesso devolve a sessão
 * DO ALUNO-ALVO com claim `act` (admin navegando como ele) e refresh de TTL curto.
 * O token trafega no CORPO (não na URL desta chamada — não vaza em access log).
 */
export async function exchangeImpersonation(
  token: string,
): Promise<GatewayResponse<{ user?: { id: string }; tokens?: AuthTokens; error?: unknown }>> {
  const env = getEnv()
  const res = await fetch(new URL('/auth/impersonate/exchange', env.GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
    body: JSON.stringify({ token }),
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
