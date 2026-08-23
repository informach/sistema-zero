import 'server-only'
import { getEnv } from '../lib/env'
import type { AuthSessionAccessToken, AuthTokens } from './session'

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
  settled: boolean
  result?: RefreshResult
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
const OPERATION_LOCKS_KEY = Symbol.for('@sistemazero/community:refresh-operation-locks')

function inflightMap(): Map<string, InflightEntry> {
  const store = globalThis as Record<symbol, unknown>
  let map = store[INFLIGHT_KEY] as Map<string, InflightEntry> | undefined
  if (!map) {
    map = new Map<string, InflightEntry>()
    store[INFLIGHT_KEY] = map
  }
  return map
}

function operationLocks(): Map<string, Promise<void>> {
  const store = globalThis as Record<symbol, unknown>
  let map = store[OPERATION_LOCKS_KEY] as Map<string, Promise<void>> | undefined
  if (!map) {
    map = new Map<string, Promise<void>>()
    store[OPERATION_LOCKS_KEY] = map
  }
  return map
}

async function serializeRefreshOperation<T>(
  refreshToken: string,
  run: () => Promise<T>,
): Promise<T> {
  const locks = operationLocks()
  const previous = locks.get(refreshToken) ?? Promise.resolve()
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const current = previous.catch(() => undefined).then(() => gate)
  locks.set(refreshToken, current)
  await previous.catch(() => undefined)
  try {
    return await run()
  } finally {
    release()
    if (locks.get(refreshToken) === current) locks.delete(refreshToken)
  }
}

/**
 * Serializa operações que usam o refresh e segue sucessores já emitidos pelo
 * single-flight. Mode/logout não reapresentam uma credencial que acabou de ser
 * rotacionada por outra request do mesmo processo.
 */
export async function withCurrentRefreshToken<T>(
  presented: string,
  run: (current: string) => Promise<T>,
): Promise<T> {
  let current = await resolveCurrentRefreshToken(presented, true)
  const RETRY = Symbol('retry-canonical-refresh')
  for (let hops = 0; hops < 8; hops++) {
    let successor: string | null = null
    const result = await serializeRefreshOperation<T | typeof RETRY>(current, async () => {
      // Uma rotação pode ter ganhado o lock no intervalo entre resolver e
      // entrar na fila. Depois que chegamos aqui ela já terminou; siga o
      // sucessor e adquira o lock DELE. Nunca aguarde uma entrada ainda pendente
      // aqui: ela está enfileirada atrás deste lock e causaria deadlock.
      const resolved = await resolveCurrentRefreshToken(current, false)
      if (resolved !== current) {
        successor = resolved
        return RETRY
      }
      return run(current)
    })
    if (result !== RETRY) return result
    if (!successor) break
    current = successor
  }
  throw new Error('Cadeia de refresh excedeu o limite de segurança')
}

async function resolveCurrentRefreshToken(
  presented: string,
  waitPending: boolean,
): Promise<string> {
  let current = presented
  for (let hops = 0; hops < 8; hops++) {
    const hit = inflightMap().get(current)
    if (!hit || Date.now() - hit.at >= TTL_MS) break
    if (!hit.settled && !waitPending) break
    const result = hit.settled ? hit.result : await hit.promise
    if (!result || typeof result === 'string') break
    current = result.refreshToken
  }
  return current
}

/**
 * Atualiza os resultados ainda cacheados depois de uma mudança de modo. Sem
 * isso, uma request que reaproveitasse o single-flight poderia regravar um
 * access readonly antigo por cima do access recém-elevado.
 */
export async function replaceCachedAccessToken(
  presented: string,
  access: AuthSessionAccessToken,
): Promise<void> {
  const inflight = inflightMap()
  let current = presented
  for (let hops = 0; hops < 8; hops++) {
    const entry = inflight.get(current)
    if (!entry || Date.now() - entry.at >= TTL_MS) return
    const result = await entry.promise
    if (typeof result === 'string') return
    entry.promise = Promise.resolve({
      ...result,
      accessToken: access.accessToken,
      tokenType: access.tokenType,
      expiresIn: access.expiresIn,
      refreshExpiresIn: access.refreshExpiresIn,
    })
    entry.settled = true
    entry.result = await entry.promise
    current = result.refreshToken
  }
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

  let entry!: InflightEntry
  const promise = serializeRefreshOperation(refreshToken, () =>
    doRefresh(refreshToken, forward),
  ).then((result) => {
    entry.settled = true
    entry.result = result
    // Indisponibilidade é transitória — não cache (a próxima tentativa re-tenta).
    if (result === 'unavailable') inflight.delete(refreshToken)
    return result
  })
  entry = { promise, at: now, settled: false }
  inflight.set(refreshToken, entry)
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
