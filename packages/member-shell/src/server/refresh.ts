import 'server-only'
import { getEnv } from '../lib/env'
import type { AuthTokens } from './session'

/**
 * Resultado da rotação: tokens novos, `invalid` (auth rejeitou — sessão morta,
 * vá p/ login) ou `unavailable` (gateway/rede fora — degrade sem deslogar).
 */
export type RefreshResult = AuthTokens | 'invalid' | 'unavailable'

/** Prova de origem repassada ao gateway (`x-forwarded-for`/`x-request-id`). */
export type ForwardHeaders = Record<string, string>

// Auth (refresh) é rápido por contrato — gateway pendurado não pode segurar a
// request do aluno (vira `unavailable`, que degrada sem deslogar).
const AUTH_TIMEOUT_MS = 15_000

const TTL_MS = 60_000

interface InflightEntry {
  promise: Promise<RefreshResult>
  at: number
}

/**
 * O estado do single-flight vive em `globalThis` (registro global de símbolos),
 * NÃO em escopo de módulo: o Turbopack separa proxy, páginas RSC e route
 * handlers em TRÊS bundles, cada um com a própria cópia deste módulo
 * (verificado nos chunks do build) — um Map de módulo permitiria uma rotação
 * concorrente POR CONTEXTO com o MESMO refresh token, e a reuse-detection do
 * auth revogaria a família inteira (logout surpresa, ex.: beacon de posição +
 * navegação simultâneos numa aba ociosa). Os três bundles rodam no mesmo
 * processo (`next start`/`next dev`), então o `globalThis` é o ponto de
 * encontro.
 */
const INFLIGHT_KEY = Symbol.for('@sistemazero/community:refresh-inflight')

function inflightMap(): Map<string, InflightEntry> {
  const store = globalThis as Record<symbol, unknown>
  let map = store[INFLIGHT_KEY] as Map<string, InflightEntry> | undefined
  if (!map) {
    map = new Map<string, InflightEntry>()
    store[INFLIGHT_KEY] = map
  }
  return map
}

/**
 * Rotaciona os tokens no auth (via gateway) com SINGLE-FLIGHT + cache curto por
 * refresh token: requisições CONCORRENTES (prefetch + navegação, proxy + route
 * handler, beacon + página) compartilham UMA rotação — apresentar o MESMO
 * refresh token duas vezes ao auth dispara a reuse-detection e revoga a família
 * inteira (logout). Estado em `globalThis` (ver acima) = OK aqui (community é
 * single-réplica pré-MVP; com N réplicas este cache precisa ir p/ um store
 * compartilhado).
 */
export function refreshTokens(
  refreshToken: string,
  forward: ForwardHeaders = {},
): Promise<RefreshResult> {
  const inflight = inflightMap()
  const now = Date.now()
  const hit = inflight.get(refreshToken)
  if (hit && now - hit.at < TTL_MS) return hit.promise

  const promise = doRefresh(refreshToken, forward).then((result) => {
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

async function doRefresh(refreshToken: string, forward: ForwardHeaders): Promise<RefreshResult> {
  try {
    const res = await fetch(new URL('/auth/refresh', getEnv().GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...forward },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
    if (!res.ok) return res.status >= 500 ? 'unavailable' : 'invalid'
    const data = (await res.json().catch(() => null)) as { tokens?: AuthTokens } | null
    return data?.tokens?.accessToken ? data.tokens : 'invalid'
  } catch {
    return 'unavailable'
  }
}
