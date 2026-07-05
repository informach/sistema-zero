import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type {
  ChallengeEntryArgs,
  ClubContributionArgs,
  CourseAccessResult,
  MembersGateway,
  MuralCommentArgs,
  ShowcaseEligibilityArgs,
  ShowcaseEligibilityResult,
  ShowcasePublishedArgs,
} from '../../domain/ports/members-gateway.port'

export interface MembersHttpGatewayOptions {
  /** Base do members (ex.: http://localhost:3004). Sem `/members`. */
  baseUrl: string
  /** Timeout por chamada (ms). Sem ele, um members travado pendura a leitura. */
  timeoutMs?: number
  /** Token interno exigido pelo members na rota S2S (= INTERNAL_API_TOKEN do members). */
  internalToken?: string
  /**
   * Segredo HMAC (= GATEWAY_HMAC_SECRET) p/ assinar o webhook `/members/webhooks/showcase`
   * (o members o verifica). Sem ele, a notificação de Mural é um no-op silencioso.
   */
  hmacSecret?: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
  /** Injetável em testes (clock do timestamp da assinatura). */
  now?: () => Date
  logger?: Logger
}

const DEFAULT_TIMEOUT_MS = 5_000
/** Paths EXATOS que o members assina/verifica (`<MÉTODO>.<path>.<corpo>`; S2S direta). */
const SHOWCASE_WEBHOOK_PATH = '/members/webhooks/showcase'
const CHALLENGE_WEBHOOK_PATH = '/members/webhooks/challenge'
const CLUBE_WEBHOOK_PATH = '/members/webhooks/clube'
const MURAL_COMMENT_WEBHOOK_PATH = '/members/webhooks/mural-comment'
const SHOWCASE_NOTIFY_ATTEMPTS = 3
const SHOWCASE_NOTIFY_RETRY_BASE_MS = 100

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const retryableShowcaseStatus = (status: number) =>
  status === 408 || status === 429 || status >= 500

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
  const now = opts.now ?? (() => new Date())
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  }
  if (opts.internalToken) headers['x-internal-token'] = opts.internalToken

  return {
    async checkAccess(
      userId: string,
      courseRefs: string[],
      communityRefs: string[] = [],
    ): Promise<CourseAccessResult> {
      const res = await doFetch(`${base}/members/internal/access-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, courseRefs, communityRefs }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        throw new Error(`members access-check respondeu ${res.status}`)
      }
      // O members responde `{ grants, hasMaster, hasMasterKids, communities }` (access-check.service).
      const body = (await res.json()) as {
        grants?: unknown
        hasMaster?: unknown
        hasMasterKids?: unknown
        communities?: unknown
      }
      return {
        granted: Array.isArray(body.grants) ? (body.grants as string[]) : [],
        hasMaster: Boolean(body.hasMaster),
        hasMasterKids: Boolean(body.hasMasterKids),
        communities: Array.isArray(body.communities) ? (body.communities as string[]) : [],
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
      // Equipe (chave-mestra virtual): repassa `privileged=true` p/ o members honrar (publicar
      // no Mural p/ testar). Aluno comum → omite (o default do members é `false`).
      if (args.privileged) qs.set('privileged', 'true')
      const res = await doFetch(`${base}/members/internal/showcase-eligibility?${qs}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      })
      // 403 (sem matrícula real — ex.: equipe testando, que o internal checa com
      // privileged:false) e 404 (aula rascunho/ausente) são "definitivamente NÃO
      // elegível", não falha de infra: devolve eligible:false → o service responde
      // PostingNotAllowedError (403 limpo) em vez de 500 "Erro interno". 401/5xx/
      // timeout seguem FAIL-CLOSED (throw): o publish erra e pode reentregar.
      if (res.status === 403 || res.status === 404) {
        return {
          eligible: false,
          title: '',
          summary: '',
          defaultCoverUrl: null,
          chain: null,
          courseId: '',
          audience: 'adult',
        }
      }
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

    async notifyShowcasePublished(args: ShowcasePublishedArgs): Promise<void> {
      await postSignedWebhook(SHOWCASE_WEBHOOK_PATH, 'showcase', {
        userId: args.userId,
        accountId: args.accountId,
        courseId: args.courseId,
        audience: args.audience,
      })
    },

    async notifyChallengeEntry(args: ChallengeEntryArgs): Promise<void> {
      await postSignedWebhook(CHALLENGE_WEBHOOK_PATH, 'challenge', {
        userId: args.userId,
        accountId: args.accountId,
        audience: args.audience,
        challengeKey: args.challengeKey,
      })
    },

    async notifyClubContribution(args: ClubContributionArgs): Promise<void> {
      await postSignedWebhook(CLUBE_WEBHOOK_PATH, 'clube', {
        userId: args.userId,
        accountId: args.accountId,
        audience: args.audience,
        kind: args.kind,
        contentId: args.contentId,
      })
    },

    async notifyMuralComment(args: MuralCommentArgs): Promise<void> {
      await postSignedWebhook(MURAL_COMMENT_WEBHOOK_PATH, 'mural-comment', {
        userId: args.userId,
        accountId: args.accountId,
        audience: args.audience,
        commentId: args.commentId,
      })
    },
  }

  /**
   * POST assinado (HMAC canônico `<MÉTODO>.<path>.<corpo>` + `x-delivery-id`) com
   * retry — BEST-EFFORT: NUNCA lança (os chamadores disparam em fire-and-forget
   * `void`; uma rejeição viraria unhandled rejection e derrubaria o processo).
   * Sem segredo HMAC (dev/local) → no-op.
   */
  async function postSignedWebhook(
    path: string,
    kind: string,
    payload: Record<string, string>,
  ): Promise<void> {
    if (!opts.hmacSecret) return
    const rawBody = JSON.stringify(payload)
    const deliveryId = randomUUID()
    for (let attempt = 1; attempt <= SHOWCASE_NOTIFY_ATTEMPTS; attempt++) {
      try {
        // Assinatura DENTRO do try (falha ao assinar cai no best-effort abaixo).
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({ method: 'POST', path, body: rawBody }),
          ts,
        )
        const res = await doFetch(`${base}${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
            'x-delivery-id': deliveryId,
          },
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (res.ok) return
        if (retryableShowcaseStatus(res.status) && attempt < SHOWCASE_NOTIFY_ATTEMPTS) {
          await delay(SHOWCASE_NOTIFY_RETRY_BASE_MS * attempt)
          continue
        }
        opts.logger?.warn(`members.${kind}_notify_failed`, {
          userId: payload.userId,
          status: res.status,
          attempt,
        })
        return
      } catch (error) {
        if (attempt < SHOWCASE_NOTIFY_ATTEMPTS) {
          await delay(SHOWCASE_NOTIFY_RETRY_BASE_MS * attempt)
          continue
        }
        // Best-effort: a publicação no Mural NUNCA falha por causa da gamificação.
        opts.logger?.warn(`members.${kind}_notify_error`, {
          userId: payload.userId,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }
    }
  }
}
