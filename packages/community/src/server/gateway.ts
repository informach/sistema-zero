import 'server-only'
import { getEnv } from '@/lib/env'
import {
  type AuthTokens,
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from './session'

export interface GatewayResponse<T = unknown> {
  status: number
  body: T
}

export interface CallOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
}

async function rawFetch(path: string, opts: CallOpts, access: string | null): Promise<Response> {
  const env = getEnv()
  const url = new URL(path, env.GATEWAY_URL)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (access) headers.authorization = `Bearer ${access}`
  return fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  })
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    return null as T
  }
}

/** Rotação de tokens (gateway → auth /refresh). Regrava os cookies; null se falhar. */
async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  const env = getEnv()
  const res = await fetch(new URL('/auth/refresh', env.GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  })
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
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
  return { status: res.status, body: await readJson(res) }
}

/** Logout (revoga o refresh no auth). Best-effort. */
export async function logoutRequest(refreshToken: string): Promise<void> {
  const env = getEnv()
  try {
    await fetch(new URL('/auth/logout', env.GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken, allSessions: false }),
      cache: 'no-store',
    })
  } catch {
    // best-effort; os cookies são limpos de qualquer forma
  }
}
