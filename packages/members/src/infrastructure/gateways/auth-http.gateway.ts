import type { Logger } from '@sistemazero/core/logging'
import type { AccountIdentity, AuthGateway } from '../../domain/ports/auth-gateway.port'

export interface AuthHttpGatewayOptions {
  /** Base do auth (ex.: http://auth.railway.internal:3002). Sem `/auth`. */
  baseUrl: string
  /** Token S2S (= AUTH_INTERNAL_TOKEN do auth). */
  internalToken?: string
  /** Timeout por chamada (ms). */
  timeoutMs?: number
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>
  logger?: Logger
}

const DEFAULT_TIMEOUT_MS = 8_000

/**
 * Adapter HTTP do AUTH (report dos pais): identidade mínima do responsável +
 * nomes das crianças, por lote — chamadas S2S DIRETAS (`x-internal-token`).
 * Erro/timeout → LANÇA: o job pula a conta e re-tenta no próximo ciclo (nada
 * é marcado como enviado sem os dados).
 */
export function createAuthHttpGateway(opts: AuthHttpGatewayOptions): AuthGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.internalToken) headers['x-internal-token'] = opts.internalToken

  const post = async (path: string, ids: string[]): Promise<unknown> => {
    const res = await doFetch(`${base}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`auth ${path} respondeu ${res.status}`)
    return res.json()
  }

  return {
    async getAccountIdentities(ids: string[]): Promise<AccountIdentity[]> {
      if (ids.length === 0) return []
      const body = (await post('/auth/internal/users/emails', ids)) as { users?: unknown }
      if (!Array.isArray(body.users)) return []
      return body.users
        .filter((u): u is Record<string, unknown> => Boolean(u) && typeof u === 'object')
        .map((u) => ({
          id: typeof u.id === 'string' ? u.id : '',
          email: typeof u.email === 'string' ? u.email : '',
          firstName: typeof u.firstName === 'string' ? u.firstName : '',
        }))
        .filter((u) => u.id !== '' && u.email !== '')
    },

    async getProfileNames(ids: string[]): Promise<Map<string, string>> {
      if (ids.length === 0) return new Map()
      const body = (await post('/auth/internal/profiles/batch', ids)) as { profiles?: unknown }
      const out = new Map<string, string>()
      if (!Array.isArray(body.profiles)) return out
      for (const p of body.profiles) {
        if (!p || typeof p !== 'object') continue
        const rec = p as Record<string, unknown>
        if (typeof rec.id === 'string' && typeof rec.name === 'string') out.set(rec.id, rec.name)
      }
      return out
    },
  }
}
