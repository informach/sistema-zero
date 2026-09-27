import type { Logger } from '@sistemazero/core/logging'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import type {
  ChallengeAnalyticsEvent,
  ChallengeAnalyticsEventName,
  ChallengeAnalyticsGateway,
} from '../../domain/ports/challenge-analytics-gateway.port'
import type {
  ChallengeBehaviorMessageKind,
  ChallengeLifecycleCandidate,
  ChallengeLifecycleRepository,
} from '../../domain/ports/challenge-lifecycle-repository.port'
import type { MessagingGateway } from '../../domain/ports/messaging-gateway.port'
import { expiresOnKey } from '../../domain/ports/renewal-reminder-repository.port'

export interface ChallengeLifecycleOptions {
  batchLimit?: number
  kidsUrl: string
  funnelUrl: string
}

const DAY_MS = 86_400_000
const DEFAULT_BATCH_LIMIT = 200
const AUTH_BATCH_LIMIT = 100

const TEMPLATE_BY_KIND: Record<ChallengeBehaviorMessageKind, string> = {
  not_activated: 'challenge-not-activated',
  not_started: 'challenge-not-started',
  day_one_complete: 'challenge-day-one-complete',
  completed: 'challenge-completed',
}

/** Automação comportamental do Desafio, sempre dirigida ao responsável. */
export class SendChallengeLifecycleService {
  constructor(
    private readonly lifecycle: ChallengeLifecycleRepository,
    private readonly auth: AuthGateway,
    private readonly messaging: MessagingGateway,
    private readonly clock: () => Date,
    private readonly logger: Logger,
    private readonly opts: ChallengeLifecycleOptions,
    private readonly analytics?: ChallengeAnalyticsGateway,
  ) {}

  async runCycle(): Promise<{ sent: number; skipped: number; failed: number }> {
    const now = this.clock()
    const candidates = await this.lifecycle.listCandidates(
      now,
      this.opts.batchLimit ?? DEFAULT_BATCH_LIMIT,
    )
    if (candidates.length === 0) return { sent: 0, skipped: 0, failed: 0 }

    const identities = new Map<
      string,
      Awaited<ReturnType<AuthGateway['getAccountIdentities']>>[number]
    >()
    const accountIds = [...new Set(candidates.map((candidate) => candidate.accountId))]
    for (let offset = 0; offset < accountIds.length; offset += AUTH_BATCH_LIMIT) {
      const batch = await this.auth.getAccountIdentities(
        accountIds.slice(offset, offset + AUTH_BATCH_LIMIT),
      )
      for (const identity of batch) identities.set(identity.id, identity)
    }

    await this.publishAnalytics(candidates, identities, now)

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const candidate of candidates) {
      const identity = identities.get(candidate.accountId)
      const kind = identity ? desiredKind(candidate, identity.activated, now) : null
      if (!identity || !kind || candidate.sentKinds.includes(kind)) {
        skipped++
        continue
      }

      const templateKey = TEMPLATE_BY_KIND[kind]
      const expiresOn = expiresOnKey(candidate.expiresAt)
      const nome = identity.firstName || 'Responsável'
      const link = linkFor(kind, candidate.courseRef, this.opts)
      try {
        await this.messaging.sendEmail({
          templateKey,
          recipient: { name: nome, email: identity.email },
          variables: { nome, link },
          idempotencyKey: `${templateKey}:${candidate.entitlementId}:${expiresOn}`,
        })
        await this.lifecycle.markMessageSent(candidate.entitlementId, expiresOn, kind, this.clock())
        sent++
      } catch (error) {
        failed++
        this.logger.warn('challenge_lifecycle.message_failed', {
          entitlementId: candidate.entitlementId,
          messageKind: kind,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (sent > 0 || failed > 0) {
      this.logger.info('challenge_lifecycle.cycle', { sent, skipped, failed })
    }
    return { sent, skipped, failed }
  }

  private async publishAnalytics(
    candidates: ChallengeLifecycleCandidate[],
    identities: Map<string, { activated: boolean | null }>,
    now: Date,
  ): Promise<void> {
    if (!this.analytics) return
    const events = new Map<string, ChallengeAnalyticsEvent>()
    const add = (buyerUserId: string, eventName: ChallengeAnalyticsEventName) => {
      events.set(`${buyerUserId}:${eventName}`, { buyerUserId, eventName, occurredAt: now })
    }
    for (const candidate of candidates) {
      if (identities.get(candidate.accountId)?.activated === true) {
        add(candidate.accountId, 'account_activated')
      }
      if (candidate.started) add(candidate.accountId, 'challenge_started')
      if (candidate.dayOneComplete) add(candidate.accountId, 'challenge_day_completed')
      if (candidate.completed) add(candidate.accountId, 'challenge_completed')
    }
    if (events.size === 0) return
    try {
      await this.analytics.publish([...events.values()])
    } catch (error) {
      this.logger.warn('challenge_lifecycle.analytics_failed', {
        events: events.size,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export function desiredKind(
  candidate: ChallengeLifecycleCandidate,
  activated: boolean | null,
  now: Date,
): ChallengeBehaviorMessageKind | null {
  if (candidate.completed) return 'completed'
  if (candidate.dayOneComplete) return 'day_one_complete'
  if (candidate.started) return null
  if (activated == null) return null

  const ageMs = now.getTime() - candidate.grantedAt.getTime()
  if (activated && ageMs >= 2 * DAY_MS) return 'not_started'
  if (!activated && ageMs >= DAY_MS) return 'not_activated'
  return null
}

function linkFor(
  kind: ChallengeBehaviorMessageKind,
  courseRef: string,
  opts: ChallengeLifecycleOptions,
): string {
  if (kind === 'not_activated') return `${opts.kidsUrl}/esqueci-senha`
  if (kind === 'not_started') return `${opts.kidsUrl}/perfis`
  if (kind === 'completed') return `${opts.funnelUrl}/kids/comunidade-do-criador/oferta`
  return `${opts.kidsUrl}/cursos/${encodeURIComponent(courseRef)}`
}
