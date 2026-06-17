import type {
  ProfileAllowance,
  ProfileAllowanceGateway,
} from '../../domain/ports/profile-allowance-gateway.port'

export interface MembersAllowanceGatewayOptions {
  /** Base do members (ex.: http://members.railway.internal:3004). Sem `/members`. */
  baseUrl: string
  /**
   * Token interno exigido pelo members na rota S2S de allowance (= INTERNAL_API_TOKEN
   * do members). Ausente em dev/local (members sem token) → header não é enviado.
   */
  internalToken?: string
  /** Timeout por chamada (ms). */
  timeoutMs?: number
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
}

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Adapter S2S do members: `GET /members/internal/profile-allowance?accountId=...`
 * (rota interna, fora do gateway — exige o `x-internal-token` do members). Devolve
 * o teto de perfis da conta. Erros/timeout → LANÇA (o create de perfil falha
 * fechado: sem o teto não dá para saber se a conta pode criar).
 */
export function createMembersAllowanceGateway(
  opts: MembersAllowanceGatewayOptions,
): ProfileAllowanceGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const headers: Record<string, string> = { accept: 'application/json' }
  if (opts.internalToken) headers['x-internal-token'] = opts.internalToken

  return {
    async getAllowance(accountUserId: string): Promise<ProfileAllowance> {
      const url = `${base}/members/internal/profile-allowance?accountId=${encodeURIComponent(accountUserId)}`
      const res = await doFetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        throw new Error(`members profile-allowance respondeu ${res.status}`)
      }
      const body = (await res.json()) as { maxProfiles?: unknown }
      const n = body.maxProfiles
      const maxProfiles = typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0
      return { maxProfiles }
    },
  }
}
