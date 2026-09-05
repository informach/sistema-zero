import { and, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import type {
  MoldaRolloutCandidate,
  MoldaRolloutCandidateSource,
} from '../../../domain/ports/molda-rollout-candidates.port'
import type { Database } from './db'
import { entitlements } from './schema'

const COMMUNITY_OFFER_SLUGS = [
  'comunidade-dos-criadores-mensal',
  'comunidade-dos-criadores-anual',
] as const

export class DrizzleMoldaRolloutCandidateSource implements MoldaRolloutCandidateSource {
  constructor(private readonly db: Database) {}

  async listActive(now: Date): Promise<MoldaRolloutCandidate[]> {
    const offerSlug = sql<string>`${entitlements.snapshot} ->> 'offerSlug'`
    return this.db
      .selectDistinctOn([entitlements.subscriptionId, entitlements.userId], {
        userId: entitlements.userId,
        subscriptionId: entitlements.subscriptionId,
        offerSlug,
        grantedAt: entitlements.grantedAt,
        expiresAt: entitlements.expiresAt,
      })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.sourceKind, 'subscription'),
          isNotNull(entitlements.subscriptionId),
          eq(entitlements.status, 'active'),
          or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
          inArray(offerSlug, COMMUNITY_OFFER_SLUGS),
        ),
      )
      .orderBy(
        entitlements.subscriptionId,
        entitlements.userId,
        sql`${entitlements.expiresAt} is null desc`,
        desc(entitlements.expiresAt),
        desc(entitlements.grantedAt),
      ) as Promise<MoldaRolloutCandidate[]>
  }
}
