import type { Logger } from '@sistemazero/core/logging'
import type {
  CourseAccessResult,
  MembersGateway,
  ShowcaseEligibilityArgs,
  ShowcaseEligibilityResult,
} from '../../domain/ports/members-gateway.port'

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
      // O members responde `{ grants, hasMaster, hasMasterKids }` (ver access-check.service).
      const body = (await res.json()) as {
        grants?: unknown
        hasMaster?: unknown
        hasMasterKids?: unknown
      }
      return {
        granted: Array.isArray(body.grants) ? (body.grants as string[]) : [],
        hasMaster: Boolean(body.hasMaster),
        hasMasterKids: Boolean(body.hasMasterKids),
      }
    },

    async getShowcaseEligibility(
      args: ShowcaseEligibilityArgs,
    ): Promise<ShowcaseEligibilityResult> {
      const qs = new URLSearchParams({
        accountId: args.accountId,
        userId: args.userId,
        lessonId: args.lessonId,
        blockId: args.blockId,
      })
      const res = await doFetch(`${base}/members/internal/showcase-eligibility?${qs}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`members showcase-eligibility respondeu ${res.status}`)
      const b = (await res.json()) as Partial<ShowcaseEligibilityResult>
      return {
        eligible: Boolean(b.eligible),
        title: typeof b.title === 'string' ? b.title : '',
        summary: typeof b.summary === 'string' ? b.summary : '',
        defaultCoverUrl: typeof b.defaultCoverUrl === 'string' ? b.defaultCoverUrl : null,
        chain: typeof b.chain === 'string' ? b.chain : null,
        courseId: typeof b.courseId === 'string' ? b.courseId : '',
        audience: b.audience === 'kids' ? 'kids' : 'adult',
      }
    },
  }
}
