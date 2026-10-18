import type {
  AdultCourseMilestone,
  AdultCreatorCapability,
  AdultJourneyPolicy,
} from '@sistemazero/core/journey'
import { AdultJourneyPolicySchema } from '@sistemazero/core/journey'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { AdultJourneyRepository } from '../../../domain/ports/adult-journey-repository.port'
import type { Database } from './db'
import { accountDeletionFences, adultJourneyGrants, adultJourneyPolicy, xpEvents } from './schema'

export class DrizzleAdultJourneyRepository implements AdultJourneyRepository {
  constructor(private readonly db: Database) {}
  async getPolicy() {
    const [row] = await this.db
      .select()
      .from(adultJourneyPolicy)
      .where(eq(adultJourneyPolicy.id, 'adult'))
    return row ? { version: row.version, policy: AdultJourneyPolicySchema.parse(row.policy) } : null
  }
  async savePolicy(policy: AdultJourneyPolicy, expectedVersion: number, now: Date) {
    const rows =
      expectedVersion === 0
        ? await this.db
            .insert(adultJourneyPolicy)
            .values({ id: 'adult', version: 1, policy, updatedAt: now })
            .onConflictDoNothing()
            .returning()
        : await this.db
            .update(adultJourneyPolicy)
            .set({ version: expectedVersion + 1, policy, updatedAt: now })
            .where(
              and(
                eq(adultJourneyPolicy.id, 'adult'),
                eq(adultJourneyPolicy.version, expectedVersion),
              ),
            )
            .returning()
    const row = rows[0]
    return row ? { version: row.version, policy: row.policy } : null
  }
  async listMilestones(userId: string): Promise<AdultCourseMilestone[]> {
    const rows = await this.db
      .select({ courseId: xpEvents.sourceId, type: xpEvents.sourceType })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, userId),
          eq(xpEvents.audience, 'adult'),
          inArray(xpEvents.sourceType, ['course_complete', 'course_showcased']),
        ),
      )
    const result = new Map<string, AdultCourseMilestone>()
    for (const row of rows) {
      const milestone = result.get(row.courseId) ?? {
        courseId: row.courseId,
        completed: false,
        showcased: false,
      }
      if (row.type === 'course_complete') milestone.completed = true
      if (row.type === 'course_showcased') milestone.showcased = true
      result.set(row.courseId, milestone)
    }
    return [...result.values()]
  }
  async listGranted(userId: string): Promise<AdultCreatorCapability[]> {
    return (
      await this.db
        .select({ capability: adultJourneyGrants.capability })
        .from(adultJourneyGrants)
        .where(eq(adultJourneyGrants.userId, userId))
    ).map((row) => row.capability)
  }
  async freezeGranted(
    userId: string,
    version: number,
    capabilities: readonly AdultCreatorCapability[],
    now: Date,
  ) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${userId}`}, 0))`,
      )
      const [policy] = await tx
        .select({ version: adultJourneyPolicy.version })
        .from(adultJourneyPolicy)
        .where(eq(adultJourneyPolicy.id, 'adult'))
        .for('share')
      if (policy?.version !== version) return false
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, userId))
      if (fence) return false
      if (capabilities.length)
        await tx
          .insert(adultJourneyGrants)
          .values(
            capabilities.map((capability) => ({
              userId,
              capability,
              policyVersion: version,
              grantedAt: now,
            })),
          )
          .onConflictDoNothing()
      return true
    })
  }
}
