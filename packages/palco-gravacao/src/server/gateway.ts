import { getEnv } from './env'

/**
 * O gateway do ambiente, com o token da equipe. Sem `?audience`: a equipe lê as aulas do Kids
 * como a prévia da equipe as lê (tudo aberto, sem trava e sem progresso). Uma falha de rede vira
 * um 503 sintético, como no member-shell, para quem chama cair no mesmo caminho de erro.
 */

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

const TIMEOUT_MS = 60_000
const AUTH_TIMEOUT_MS = 15_000

export async function gatewayFetch(
  path: string,
  init: { method?: string; body?: unknown; access?: string | null; timeoutMs?: number } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (init.access) headers.authorization = `Bearer ${init.access}`
  try {
    return await fetch(new URL(path, getEnv().GATEWAY_URL), {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(init.timeoutMs ?? TIMEOUT_MS),
    })
  } catch {
    return Response.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' } },
      { status: 503 },
    )
  }
}

export async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

/** Login da conta da equipe (rota pública do auth, sem `platform`: a sessão é da conta). */
export async function login(email: string, password: string): Promise<AuthTokens | null> {
  const res = await gatewayFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
    timeoutMs: AUTH_TIMEOUT_MS,
  })
  if (!res.ok) return null
  const data = await readJson<{ tokens?: AuthTokens }>(res)
  return data?.tokens?.accessToken && data.tokens.refreshToken ? data.tokens : null
}

/** Renova a sessão. `unavailable`: o auth não respondeu (a sessão continua). */
export async function refresh(
  refreshToken: string,
): Promise<AuthTokens | 'invalid' | 'unavailable'> {
  const res = await gatewayFetch('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    timeoutMs: AUTH_TIMEOUT_MS,
  })
  if (!res.ok) return res.status >= 500 ? 'unavailable' : 'invalid'
  const data = await readJson<{ tokens?: AuthTokens }>(res)
  return data?.tokens?.accessToken && data.tokens.refreshToken ? data.tokens : 'invalid'
}

/** Encerra a sessão no auth. Tentativa única; os cookies saem de qualquer jeito. */
export async function logout(refreshToken: string): Promise<void> {
  await gatewayFetch('/auth/logout', {
    method: 'POST',
    body: { refreshToken, allSessions: false },
    timeoutMs: AUTH_TIMEOUT_MS,
  })
}

const enc = encodeURIComponent

export const paths = {
  course: (slug: string) => `/members/courses/${enc(slug)}`,
  lesson: (slug: string, lessonId: string) =>
    `/members/courses/${enc(slug)}/lessons/${enc(lessonId)}`,
  projectCheck: (lessonId: string, sectionId: string) =>
    `/members/lessons/${enc(lessonId)}/sections/${enc(sectionId)}/project-check`,
  ebook: (slug: string, lessonId: string, blockId: string) =>
    `/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/ebook/resolve`,
  attachment: (slug: string, lessonId: string, attachmentId: string) =>
    `/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/attachments/${enc(attachmentId)}/resolve`,
}
