import type { Logger } from '@sistemazero/core/logging'
import type {
  AccountIdentity,
  AuthGateway,
  ProfileIdentity,
} from '../../domain/ports/auth-gateway.port'

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
    async getPublicStaffNames(ids) {
      const names = new Map<string, string>()
      // Auth's staff directory accepts at most 100 accounts per batch.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100)
        const body = await post('/auth/internal/staff-directory', batch)
        if (!Array.isArray(body)) throw new Error('Diretório público de equipe inválido')
        for (const row of body) {
          if (
            row &&
            typeof row === 'object' &&
            'id' in row &&
            typeof row.id === 'string' &&
            batch.includes(row.id) &&
            'active' in row &&
            row.active === true &&
            'name' in row &&
            typeof row.name === 'string'
          ) {
            const name = row.name.trim().split(/\s+/)[0]
            if (name) names.set(row.id, name)
          }
        }
      }
      return names
    },
    async getCertificateIdentity(accountId, profileId) {
      const res = await doFetch(`${base}/auth/internal/profiles/certificate-identity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ accountId, profileId }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`auth certificate identity respondeu ${res.status}`)
      const body = (await res.json()) as Record<string, unknown>
      if (typeof body.fullName !== 'string' || typeof body.confirmed !== 'boolean')
        throw new Error('Identidade de certificado inválida')
      return { fullName: body.fullName, confirmed: body.confirmed }
    },
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
          activated: typeof u.activated === 'boolean' ? u.activated : null,
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
        if (typeof rec.id === 'string')
          out.set(
            rec.id,
            typeof rec.publicNickname === 'string' && rec.publicNickname.trim()
              ? rec.publicNickname.trim()
              : 'Criador(a)',
          )
      }
      return out
    },

    async getProfileIdentities(ids: string[]): Promise<Map<string, ProfileIdentity>> {
      if (ids.length === 0) return new Map()
      const body = (await post('/auth/internal/profiles/batch', ids)) as { profiles?: unknown }
      const out = new Map<string, ProfileIdentity>()
      if (!Array.isArray(body.profiles)) return out
      for (const p of body.profiles) {
        if (!p || typeof p !== 'object') continue
        const rec = p as Record<string, unknown>
        if (typeof rec.id !== 'string') continue
        const firstName =
          typeof rec.publicNickname === 'string' && rec.publicNickname.trim()
            ? rec.publicNickname.trim()
            : 'Criador(a)'
        out.set(rec.id, { firstName, public: rec.publicProfileEnabled === true })
      }
      return out
    },
  }
}
