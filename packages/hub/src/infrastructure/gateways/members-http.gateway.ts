import type { Logger } from '@sistemazero/core/logging'
import type { CourseAccessResult, MembersGateway } from '../../domain/ports/members-gateway.port'

export interface MembersHttpGatewayOptions {
  /** Base do members (ex.: http://localhost:3004). Sem `/members`. */
  baseUrl: string
  /** Timeout por chamada (ms). Sem ele, um members travado pendura a leitura. */
  timeoutMs?: number
  /** Token interno exigido pelo members na rota S2S (= INTERNAL_API_TOKEN do members). */
  internalToken?: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
  logger?: Logger
}

const DEFAULT_TIMEOUT_MS = 5_000

/**
 * Adapter HTTP do members. Resolve `POST /members/internal/access-check` (rota S2S
 * que devolve os grants do usuário) — chamada direta na rede interna com o
 * `x-internal-token`. Erro/timeout → FAIL-CLOSED (lança): não dá acesso por falha
 * de infra. O chamador (leitura) trata como "sem acesso" para aquele recurso.
 */
export function createMembersHttpGateway(opts: MembersHttpGatewayOptions): MembersGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  }
  if (opts.internalToken) headers['x-internal-token'] = opts.internalToken

  return {
    async checkAccess(userId: string, courseRefs: string[]): Promise<CourseAccessResult> {
      const res = await doFetch(`${base}/members/internal/access-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, courseRefs }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        throw new Error(`members access-check respondeu ${res.status}`)
      }
      // O members responde `{ grants, hasMaster }` (ver access-check.service).
      const body = (await res.json()) as { grants?: unknown; hasMaster?: unknown }
      return {
        granted: Array.isArray(body.grants) ? (body.grants as string[]) : [],
        hasMaster: Boolean(body.hasMaster),
      }
    },
  }
}
