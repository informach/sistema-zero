import type {
  AdultCourseMilestone,
  AdultCreatorCapability,
  AdultJourneyPolicy,
} from '@sistemazero/core/journey'
import { AdultJourneyPolicySchema, EMPTY_ADULT_JOURNEY_POLICY } from '@sistemazero/core/journey'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { AdultJourneyRepository } from '../../../domain/ports/adult-journey-repository.port'
import {
  captureAdultJourneyBeforeChange,
  lockAdultJourneyCaptureSources,
} from './adult-journey-capture'
import { listCreatorCourseGrants, saveCreatorCourseGrants } from './creator-journey-course-grants'
import type { Database } from './db'
import {
  accountDeletionFences,
  adultJourneyGrants,
  adultJourneyPolicy,
  adultJourneyReached,
  xpEvents,
} from './schema'

/** Junta as linhas do ledger em marcos por pessoa e curso (os dois marcos sem cruzar). */
export function groupMilestones(
  rows: readonly { userId: string; courseId: string; type: string }[],
): Map<string, AdultCourseMilestone[]> {
  const byUser = new Map<string, Map<string, AdultCourseMilestone>>()
  for (const row of rows) {
    const courses = byUser.get(row.userId) ?? new Map<string, AdultCourseMilestone>()
    const milestone = courses.get(row.courseId) ?? {
      courseId: row.courseId,
      completed: false,
      showcased: false,
    }
    if (row.type === 'course_complete') milestone.completed = true
    if (row.type === 'course_showcased') milestone.showcased = true
    courses.set(row.courseId, milestone)
    byUser.set(row.userId, courses)
  }
  return new Map([...byUser].map(([userId, courses]) => [userId, [...courses.values()]]))
}

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
    const candidate = AdultJourneyPolicySchema.parse(policy)
    return this.db.transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended('members-adult-journey-seed', 0))`,
        )
        if (candidate.curriculum) await lockAdultJourneyCaptureSources(tx)
        const [row] = await tx
          .insert(adultJourneyPolicy)
          .values({ id: 'adult', version: 1, policy: candidate, updatedAt: now })
          .onConflictDoNothing()
          .returning()
        // Before the first configured curriculum, adult catalog access had no pedagogical gate.
        // Capture that admission baseline in the same V1 transaction; a losing initializer writes nothing.
        if (row && candidate.curriculum)
          await captureAdultJourneyBeforeChange(
            tx,
            { policy: EMPTY_ADULT_JOURNEY_POLICY, version: 1 },
            now,
          )
        return row ? { version: row.version, policy: row.policy } : null
      }
      // Source facts cannot change while the outgoing policy is captured. No account lock is
      // acquired after these table fences; freezeGranted keeps its established account→policy order.
      await lockAdultJourneyCaptureSources(tx)
      const [source] = await tx
        .select()
        .from(adultJourneyPolicy)
        .where(eq(adultJourneyPolicy.id, 'adult'))
        .for('update')
      if (source?.version !== expectedVersion) return null
      await captureAdultJourneyBeforeChange(
        tx,
        { version: source.version, policy: AdultJourneyPolicySchema.parse(source.policy) },
        now,
      )
      const [row] = await tx
        .update(adultJourneyPolicy)
        .set({ version: expectedVersion + 1, policy: candidate, updatedAt: now })
        .where(
          and(eq(adultJourneyPolicy.id, 'adult'), eq(adultJourneyPolicy.version, expectedVersion)),
        )
        .returning()
      return row ? { version: row.version, policy: row.policy } : null
    })
  }
  async insertPolicyIfAbsent(policy: AdultJourneyPolicy, now: Date) {
    if (policy.curriculum) return this.savePolicy(policy, 0, now)
    return this.db.transaction(async (tx) => {
      // Várias instâncias subindo juntas: uma de cada vez confere e grava; a unique do `id` é a
      // segunda trava (ON CONFLICT DO NOTHING), caso alguém grave por outro caminho no meio.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended('members-adult-journey-seed', 0))`,
      )
      const [existing] = await tx
        .select({ version: adultJourneyPolicy.version })
        .from(adultJourneyPolicy)
        .where(eq(adultJourneyPolicy.id, 'adult'))
      if (existing) return null
      const [row] = await tx
        .insert(adultJourneyPolicy)
        .values({ id: 'adult', version: 1, policy, updatedAt: now })
        .onConflictDoNothing()
        .returning()
      return row ? { version: row.version, policy: row.policy } : null
    })
  }
  async listMilestones(userId: string): Promise<AdultCourseMilestone[]> {
    return (await this.listMilestonesForUsers([userId])).get(userId) ?? []
  }
  async listMilestonesForUsers(
    userIds: readonly string[],
  ): Promise<Map<string, AdultCourseMilestone[]>> {
    const out = new Map<string, AdultCourseMilestone[]>()
    if (userIds.length === 0) return out
    const rows = await this.db
      .select({ userId: xpEvents.userId, courseId: xpEvents.sourceId, type: xpEvents.sourceType })
      .from(xpEvents)
      .where(
        and(
          inArray(xpEvents.userId, [...userIds]),
          eq(xpEvents.audience, 'adult'),
          inArray(xpEvents.sourceType, ['course_complete', 'course_showcased']),
        ),
      )
    return groupMilestones(rows)
  }
  async listGranted(userId: string): Promise<AdultCreatorCapability[]> {
    return (
      await this.db
        .select({ capability: adultJourneyGrants.capability })
        .from(adultJourneyGrants)
        .where(eq(adultJourneyGrants.userId, userId))
    ).map((row) => row.capability)
  }
  async listCourseGrants(userId: string): Promise<string[]> {
    return (
      (
        await listCreatorCourseGrants(this.db, [{ userId, accountId: userId, audience: 'adult' }])
      ).get(userId) ?? []
    )
  }
  async getReached(userId: string): Promise<number | null> {
    return (await this.listReachedForUsers([userId])).get(userId) ?? null
  }
  async listReachedForUsers(userIds: readonly string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map()
    const rows = await this.db
      .select({ userId: adultJourneyReached.userId, position: adultJourneyReached.position })
      .from(adultJourneyReached)
      .where(inArray(adultJourneyReached.userId, [...userIds]))
    return new Map(rows.map((row) => [row.userId, row.position]))
  }
  async freezeGranted(
    userId: string,
    version: number,
    capabilities: readonly AdultCreatorCapability[],
    now: Date,
    reachedPosition: number | null = null,
    courseIds: readonly string[] = [],
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
      await saveCreatorCourseGrants(
        tx,
        { userId, accountId: userId, audience: 'adult' },
        version,
        courseIds,
      )
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
      if (reachedPosition !== null && Number.isInteger(reachedPosition) && reachedPosition >= 1)
        await tx
          .insert(adultJourneyReached)
          .values({
            userId,
            position: reachedPosition,
            policyVersion: version,
            reachedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: adultJourneyReached.userId,
            // Monotônico: só sobe. A versão e a data acompanham a última subida real.
            set: {
              position: sql`greatest(${adultJourneyReached.position}, excluded.position)`,
              policyVersion: sql`case when excluded.position > ${adultJourneyReached.position} then excluded.policy_version else ${adultJourneyReached.policyVersion} end`,
              reachedAt: sql`case when excluded.position > ${adultJourneyReached.position} then excluded.reached_at else ${adultJourneyReached.reachedAt} end`,
              updatedAt: now,
            },
          })
      return true
    })
  }
}
