import 'server-only'
import { getEnv } from '@/lib/env'
import type { AuthTokens } from './session'

/**
 * Resultado da rotação: tokens novos, `invalid` (auth rejeitou — sessão morta,
 * vá p/ login) ou `unavailable` (gateway/rede fora — degrade sem deslogar).
 */
export type RefreshResult = AuthTokens | 'invalid' | 'unavailable'

const TTL_MS = 60_000
const inflight = new Map<string, { promise: Promise<RefreshResult>; at: number }>()

/**
 * Rotaciona os tokens no auth (via gateway) com SINGLE-FLIGHT + cache curto por
 * refresh token: requisições CONCORRENTES (prefetch + navegação, proxy + route
 * handler) compartilham UMA rotação — apresentar o MESMO refresh token duas
 * vezes ao auth dispara a reuse-detection e revoga a família inteira (logout).
 * Estado em memória de módulo = OK aqui (community é single-réplica pré-MVP;
 * com N réplicas este cache precisa ir p/ um store compartilhado).
 */
export function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  const now = Date.now()
  const hit = inflight.get(refreshToken)
  if (hit && now - hit.at < TTL_MS) return hit.promise

  const promise = doRefresh(refreshToken).then((result) => {
    // Indisponibilidade é transitória — não cache (a próxima tentativa re-tenta).
    if (result === 'unavailable') inflight.delete(refreshToken)
    return result
  })
  inflight.set(refreshToken, { promise, at: now })
  for (const [k, v] of inflight) {
    if (now - v.at >= TTL_MS) inflight.delete(k)
  }
  return promise
}

async function doRefresh(refreshToken: string): Promise<RefreshResult> {
  try {
    const res = await fetch(new URL('/auth/refresh', getEnv().GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })
    if (!res.ok) return res.status >= 500 ? 'unavailable' : 'invalid'
    const data = (await res.json().catch(() => null)) as { tokens?: AuthTokens } | null
    return data?.tokens?.accessToken ? data.tokens : 'invalid'
  } catch {
    return 'unavailable'
  }
}
