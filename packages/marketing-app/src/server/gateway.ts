import 'server-only'
import { retryAfterMilliseconds } from '@sistemazero/marketing-contracts'
import { getEnv } from '@/lib/env'
import { getBrowserCredential, requestBrowserAccess } from './browser-session'
import { clientForwardHeaders } from './client-headers'
import { forgetDesktopAccess, getDesktopCredential, requestDesktopAccess } from './desktop-session'
import { type AuthTokens, verifyDesktopBinding } from './session'

// Tetos das chamadas de saída (upstream pendurado NÃO pode pendurar o handler):
// dados via gateway com folga; auth (login/logout) é rápido por contrato.
const GATEWAY_TIMEOUT_MS = 60_000
const AUTH_TIMEOUT_MS = 15_000

export interface GatewayResponse<T = unknown> {
  status: number
  body: T
  retryAfterMs?: number
}

export interface CallOpts {
  desktopBinding?: { userId: string; deviceId: string }
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

/** Session resolution is read-only: no request can rotate or clear another request's cookie. */
export async function gatewayFetch<T = unknown>(
  path: string,
  opts: CallOpts = {},
): Promise<GatewayResponse<T>> {
  const desktop = await getDesktopCredential()
  if (opts.desktopBinding && !desktop) {
    const response = Response.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'A sessão deste computador mudou. Reconecte a conta antes de sincronizar.',
        },
      },
      { status: 401 },
    )
    return { status: 401, body: await readJson<T>(response) }
  }
  if (desktop) {
    const access = await requestDesktopAccess(desktop, true)
    if (!access.ok) {
      // Forward an HTTP envelope without exposing the opaque credential.
      const response = Response.json(
        {
          error: {
            code: access.status === 401 ? 'UNAUTHORIZED' : 'IDENTITY_UNAVAILABLE',
            message:
              access.status === 401
                ? 'Reconecte este computador'
                : 'Servidor de identidade indisponível',
          },
        },
        { status: access.status },
      )
      return {
        status: response.status,
        body: await readJson<T>(response),
        retryAfterMs: access.retryAfterMs,
      }
    }
    if (
      opts.desktopBinding &&
      !(await verifyDesktopBinding(access.accessToken, opts.desktopBinding))
    ) {
      const response = Response.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'A identidade do computador não corresponde à sessão atual',
          },
        },
        { status: 401 },
      )
      return { status: 401, body: await readJson<T>(response) }
    }
    const response = await rawFetch(path, opts, access.accessToken)
    if (response.status === 401 || response.status === 403) forgetDesktopAccess(desktop)
    return {
      status: response.status,
      body: await readJson<T>(response),
      retryAfterMs: retryAfterMilliseconds(response.headers.get('retry-after')),
    }
  }
  const browser = await getBrowserCredential()
  const access = browser ? await requestBrowserAccess(browser) : { ok: false as const, status: 401 }
  if (!access.ok) {
    const response = Response.json(
      {
        error: {
          code: access.status === 401 ? 'UNAUTHORIZED' : 'IDENTITY_UNAVAILABLE',
          message:
            access.status === 401
              ? 'Entre novamente na sua conta'
              : 'Servidor de identidade indisponível',
        },
      },
      { status: access.status },
    )
    return {
      status: response.status,
      body: await readJson<T>(response),
      retryAfterMs: 'retryAfterMs' in access ? access.retryAfterMs : undefined,
    }
  }
  const res = await rawFetch(path, opts, access.accessToken)
  return {
    status: res.status,
    body: await readJson<T>(res),
    retryAfterMs: retryAfterMilliseconds(res.headers.get('retry-after')),
  }
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

/** Native pairing exchanges its one-use grant for an independent HttpOnly session. */
export async function desktopPairingRequest(
  action: 'start' | 'exchange',
  body: unknown,
): Promise<GatewayResponse> {
  const path = action === 'start' ? '/auth/desktop/pairings' : '/auth/desktop/pairings/exchange'
  const response = await rawFetch(path, { method: 'POST', body }, null)
  return { status: response.status, body: await readJson<unknown>(response) }
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
