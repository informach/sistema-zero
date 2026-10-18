import { createHash, randomUUID } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  analyzeKidsJourneyReadiness,
  COURSE_JOURNEY_ROLES,
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  KIDS_CREATOR_CAPABILITIES,
  type KidsJourneyEarned,
  KidsJourneyPolicySchema,
  legacyKidsJourneyPolicy,
  pauseKidsJourneyPolicy,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { and, asc, desc, eq, exists, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { COURSE_LEVELS, COURSE_TRACKS } from '../../../domain/course/course'
import {
  KIDS_JOURNEY_PREPARATION_STATUSES,
  type KidsJourneyCatalogCourse,
  type KidsJourneyOwner,
  type KidsJourneyPolicyRecord,
  type KidsJourneyPreparation,
  type KidsJourneyPreparationProgress,
  type KidsJourneyRepository,
  type KidsJourneySnapshot,
} from '../../../domain/ports/kids-journey-repository.port'
import type { Database } from './db'
import { type KidsJourneyEventFact, kidsMilestonesFromEvents } from './kids-journey-facts'
import { lockLearningOwner } from './learning-owner-lock'
import { lessonContentAvailable } from './lesson-availability'
import {
  activeLessonBlocks,
  courses,
  gamificationProfiles,
  kidsJourneyEarned,
  kidsJourneyPolicy,
  kidsJourneyPreparations,
  kidsJourneyRevisions,
  lessons,
  xpEvents,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type PreparationRow = typeof kidsJourneyPreparations.$inferSelect
const OwnerSchema = z.strictObject({ userId: z.uuid(), accountId: z.uuid() })
const EarnedSchema = z.strictObject({
  level: z.enum(JOURNEY_LEVEL_SLUGS),
  capabilities: z.array(z.enum(KIDS_CREATOR_CAPABILITIES)).max(KIDS_CREATOR_CAPABILITIES.length),
})
const CatalogCourseSchema = z.strictObject({
  id: z.uuid(),
  graduationOnly: z.boolean(),
  audience: z.enum(['kids', 'adult']),
  modality: z.enum(['recorded', 'live']),
  status: z.enum(['draft', 'published', 'archived']),
  tier: z.enum(JOURNEY_COURSE_TIERS).nullable(),
  slot: z.number().int().min(1).max(8).nullable(),
  journeyRole: z.enum(COURSE_JOURNEY_ROLES),
  hasShowcaseBlock: z.boolean().nullable(),
  level: z.enum(COURSE_LEVELS),
  track: z.enum(COURSE_TRACKS),
})
const CatalogSchema = z.array(CatalogCourseSchema)
function versionZero(): KidsJourneyPolicyRecord {
  return { version: 0, policy: legacyKidsJourneyPolicy(), updatedAt: null }
}
function emptyEarned(): KidsJourneyEarned {
  return { level: 'noob', capabilities: [] }
}

/** Canonical values come from strict schemas and catalog order is the UUID order. */
function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

/** Stable even when the policy row does not exist (version 0). */
async function lockPolicy(tx: Transaction, exclusive = false) {
  if (exclusive)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('kids-journey-policy', 0))`)
  else
    await tx.execute(
      sql`select pg_advisory_xact_lock_shared(hashtextextended('kids-journey-policy', 0))`,
    )
}

async function readPolicy(tx: Transaction): Promise<KidsJourneyPolicyRecord> {
  const [row] = await tx.select().from(kidsJourneyPolicy).where(eq(kidsJourneyPolicy.id, 'kids'))
  return row
    ? {
        version: row.version,
        policy: KidsJourneyPolicySchema.parse(row.policy),
        updatedAt: row.updatedAt,
      }
    : versionZero()
}

async function readCatalog(tx: Transaction): Promise<KidsJourneyCatalogCourse[]> {
  const showcase = tx
    .select({ id: activeLessonBlocks.id })
    .from(lessons)
    .innerJoin(activeLessonBlocks, eq(activeLessonBlocks.lessonId, lessons.id))
    .where(
      and(
        eq(lessons.courseId, courses.id),
        eq(lessons.isPublished, true),
        eq(activeLessonBlocks.kind, 'studio'),
        sql`${activeLessonBlocks.content}->'showcase'->>'enabled' = 'true'`,
        lessonContentAvailable(lessons.id),
      ),
    )
  const rows = await tx
    .select({
      id: courses.id,
      level: courses.level,
      track: courses.track,
      audience: courses.audience,
      modality: courses.modality,
      status: courses.status,
      slot: courses.careerSlot,
      journeyRole: courses.journeyRole,
      hasShowcaseBlock: exists(showcase),
    })
    .from(courses)
    .orderBy(asc(courses.id))
  return CatalogSchema.parse(
    rows.map((row) => {
      const tier = `${row.level}-${row.track}`
      return {
        ...row,
        graduationOnly: row.level === 'lenda',
        tier: JOURNEY_COURSE_TIERS.find((candidate) => candidate === tier) ?? null,
      }
    }),
  )
}

async function readOwnedEarned(
  tx: Transaction,
  owners: readonly KidsJourneyOwner[],
): Promise<Map<string, KidsJourneyEarned>> {
  if (!owners.length) return new Map()
  const ids = owners.map((owner) => owner.userId)
  const bindings = await tx
    .select({ userId: gamificationProfiles.userId, accountId: gamificationProfiles.accountId })
    .from(gamificationProfiles)
    .where(
      and(inArray(gamificationProfiles.userId, ids), eq(gamificationProfiles.audience, 'kids')),
    )
  const earnedRows = await tx
    .select()
    .from(kidsJourneyEarned)
    .where(inArray(kidsJourneyEarned.userId, ids))
  const bindingById = new Map(bindings.map((row) => [row.userId, row.accountId]))
  const earnedById = new Map(earnedRows.map((row) => [row.userId, row]))
  for (const owner of owners) {
    const binding = bindingById.get(owner.userId)
    const earned = earnedById.get(owner.userId)
    if (
      (binding && binding !== owner.accountId) ||
      (earned && earned.accountId !== owner.accountId)
    )
      throw new Error('Kids journey profile belongs to another account')
  }
  return new Map(
    owners.map((owner) => {
      const earned = earnedById.get(owner.userId)
      return [
        owner.userId,
        earned
          ? EarnedSchema.parse({ level: earned.level, capabilities: earned.capabilities })
          : emptyEarned(),
      ] as const
    }),
  )
}

async function readProfiles(
  tx: Transaction,
  owners: readonly KidsJourneyOwner[],
  catalog: readonly KidsJourneyCatalogCourse[],
): Promise<KidsJourneySnapshot['profiles']> {
  if (!owners.length) return new Map()
  const ids = owners.map((owner) => owner.userId)
  const earnedById = await readOwnedEarned(tx, owners)
  const rows = await tx
    .select({
      userId: xpEvents.userId,
      courseId: xpEvents.sourceId,
      sourceType: xpEvents.sourceType,
      sourceLevel: xpEvents.sourceLevel,
      sourceTrack: xpEvents.sourceTrack,
      sourceCareerSlot: xpEvents.sourceCareerSlot,
    })
    .from(xpEvents)
    .where(
      and(
        inArray(xpEvents.userId, ids),
        eq(xpEvents.audience, 'kids'),
        inArray(xpEvents.sourceType, ['course_complete', 'course_showcased']),
      ),
    )
  // SQL restricts sourceType to these two values; do not accept events from the other audience.
  const milestones = kidsMilestonesFromEvents(rows as KidsJourneyEventFact[], catalog)
  return new Map(
    owners.map((owner) => {
      return [
        owner.userId,
        {
          ...owner,
          milestones: milestones.get(owner.userId) ?? [],
          earned: earnedById.get(owner.userId)!,
        },
      ]
    }),
  )
}

async function saveEarned(
  tx: Transaction,
  owner: KidsJourneyOwner,
  version: number,
  earned: KidsJourneyEarned,
) {
  const levelOrder = sql`array[${sql.join(
    JOURNEY_LEVEL_SLUGS.map((level) => sql`${level}`),
    sql`, `,
  )}]::text[]`
  await tx
    .insert(kidsJourneyEarned)
    .values({ ...owner, ...earned, policyVersion: version, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: kidsJourneyEarned.userId,
      set: {
        level: sql`case when array_position(${levelOrder}, excluded.level) > array_position(${levelOrder}, ${kidsJourneyEarned.level}) then excluded.level else ${kidsJourneyEarned.level} end`,
        capabilities: sql`(select coalesce(jsonb_agg(distinct value order by value), '[]'::jsonb) from jsonb_array_elements_text(${kidsJourneyEarned.capabilities} || excluded.capabilities) as expanded(value))`,
        policyVersion: sql`greatest(${kidsJourneyEarned.policyVersion}, excluded.policy_version)`,
        updatedAt: sql`greatest(${kidsJourneyEarned.updatedAt}, excluded.updated_at)`,
      },
      setWhere: eq(kidsJourneyEarned.accountId, owner.accountId),
    })
}

const cohort = sql`(
  select ${xpEvents.userId} as user_id from ${xpEvents}
  where ${xpEvents.audience} = 'kids' and ${xpEvents.sourceType} in ('course_complete','course_showcased')
  union select ${kidsJourneyEarned.userId} as user_id from ${kidsJourneyEarned}
)`

async function nextCohortOwner(tx: Transaction, cursor: string | null, upperBound: string | null) {
  if (!upperBound) return null
  const rows = await tx.execute<{
    userId: string
    profileAccountId: string | null
    earnedAccountId: string | null
  }>(sql`select cohort.user_id as "userId", ${gamificationProfiles.accountId} as "profileAccountId",
    ${kidsJourneyEarned.accountId} as "earnedAccountId"
    from ${cohort} cohort
    left join ${gamificationProfiles} on ${gamificationProfiles.userId} = cohort.user_id and ${gamificationProfiles.audience} = 'kids'
    left join ${kidsJourneyEarned} on ${kidsJourneyEarned.userId} = cohort.user_id
    where cohort.user_id <= ${upperBound}::uuid and (${cursor}::uuid is null or cohort.user_id > ${cursor}::uuid)
    order by cohort.user_id limit 1`)
  return rows[0] ?? null
}

function preparation(row: PreparationRow): KidsJourneyPreparation {
  return {
    ...row,
    sourcePolicy: KidsJourneyPolicySchema.parse(row.sourcePolicy),
    candidatePolicy: KidsJourneyPolicySchema.parse(row.candidatePolicy),
    catalog: CatalogSchema.parse(row.catalog),
    status: z.enum(KIDS_JOURNEY_PREPARATION_STATUSES).parse(row.status),
  }
}

export class DrizzleKidsJourneyRepository implements KidsJourneyRepository {
  constructor(private readonly db: Database) {}

  async readSnapshot(owners: readonly KidsJourneyOwner[]): Promise<KidsJourneySnapshot> {
    const unique = new Map<string, KidsJourneyOwner>()
    for (const input of owners) {
      const owner = OwnerSchema.parse(input)
      if (unique.has(owner.userId) && unique.get(owner.userId)!.accountId !== owner.accountId)
        throw new Error('Conflicting Kids journey owners')
      unique.set(owner.userId, owner)
    }
    // No GET/freeze helper here: preview and batch readers share this read-only transaction.
    return this.db.transaction(
      async (tx) => {
        const policy = await readPolicy(tx)
        const catalog = await readCatalog(tx)
        return { policy, catalog, profiles: await readProfiles(tx, [...unique.values()], catalog) }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }

  async freezeEarned(
    inputOwner: KidsJourneyOwner,
    expectedVersion: number,
    earned: KidsJourneyEarned,
  ) {
    const owner = OwnerSchema.parse(inputOwner)
    const parsed = EarnedSchema.parse(earned)
    return this.db.transaction(async (tx) => {
      try {
        await lockLearningOwner(tx, owner)
      } catch (error) {
        // The shared lock helper rejects the durable deletion fence.
        if (error instanceof ForbiddenError) return 'deleted' as const
        throw error
      }
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${owner.userId}`}, 0))`,
      )
      await lockPolicy(tx)
      const currentPolicy = await readPolicy(tx)
      if (currentPolicy.version !== expectedVersion) return 'conflict' as const
      const frozen = (await readOwnedEarned(tx, [owner])).get(owner.userId)!
      // Paused means no new rights, including a delayed/mistaken internal caller at the same version.
      await saveEarned(
        tx,
        owner,
        expectedVersion,
        currentPolicy.policy.mode === 'paused' ? frozen : parsed,
      )
      return 'frozen' as const
    })
  }

  async createPreparation(input: Parameters<KidsJourneyRepository['createPreparation']>[0]) {
    const { expectedVersion } = input
    const actorId = z.uuid().parse(input.actorId)
    const reason = z.string().trim().min(1).max(500).parse(input.reason)
    const candidatePolicy = KidsJourneyPolicySchema.parse(input.candidatePolicy)
    return this.db.transaction(async (tx) => {
      await lockPolicy(tx)
      const source = await readPolicy(tx)
      if (source.version !== expectedVersion) return null
      if (
        candidatePolicy.mode === 'paused' &&
        hash(candidatePolicy) !== hash(pauseKidsJourneyPolicy(source.policy))
      )
        throw new Error('Pausing must retain the current Kids journey policy')
      const catalog = await readCatalog(tx)
      const readiness = analyzeKidsJourneyReadiness({ policy: candidatePolicy, catalog })
      if (
        readiness.status === 'unavailable' ||
        readiness.issues.some((issue) => issue.severity === 'error')
      )
        throw new Error('Kids journey policy is not ready for preparation')
      const [last] = await tx.execute<{ userId: string }>(
        sql`select user_id as "userId" from ${cohort} cohort order by user_id desc limit 1`,
      )
      const now = new Date()
      const [row] = await tx
        .insert(kidsJourneyPreparations)
        .values({
          id: randomUUID(),
          expectedVersion: source.version,
          sourcePolicy: source.policy,
          candidatePolicy,
          draftHash: hash(candidatePolicy),
          catalogHash: hash(catalog),
          catalog,
          cursor: null,
          upperBound: last?.userId ?? null,
          processed: 0,
          status: last ? 'preparing' : 'ready',
          actorId,
          reason,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      return preparation(row!)
    })
  }

  async getPreparation(id: string) {
    const [row] = await this.db
      .select()
      .from(kidsJourneyPreparations)
      .where(eq(kidsJourneyPreparations.id, id))
    return row ? preparation(row) : null
  }

  async advancePreparation(
    id: string,
    expectedCursor: string | null,
  ): Promise<KidsJourneyPreparationProgress> {
    // Read the next owner before locking; after account → owner → policy we verify it again.
    // Publish never takes account locks, avoiding a policy/account lock cycle.
    const initial = await this.getPreparation(id)
    if (!initial) return { status: 'missing' }
    const candidate = await this.db.transaction((tx) =>
      nextCohortOwner(tx, initial.cursor, initial.upperBound),
    )
    return this.db.transaction(async (tx) => {
      const accountId = candidate?.profileAccountId ?? candidate?.earnedAccountId
      let deleted = false
      if (candidate && accountId) {
        try {
          await lockLearningOwner(tx, { userId: candidate.userId, accountId })
        } catch (error) {
          if (error instanceof ForbiddenError) deleted = true
          else throw error
        }
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${candidate.userId}`}, 0))`,
        )
      }
      await lockPolicy(tx)
      const [row] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(eq(kidsJourneyPreparations.id, id))
        .for('update')
      if (!row) return { status: 'missing' }
      const current = preparation(row)
      if (current.status !== 'preparing' || current.cursor !== expectedCursor)
        return { status: 'conflict' }
      if ((await readPolicy(tx)).version !== current.expectedVersion) {
        await tx
          .update(kidsJourneyPreparations)
          .set({ status: 'stale', updatedAt: new Date() })
          .where(eq(kidsJourneyPreparations.id, id))
        return { status: 'stale' }
      }
      const next = await nextCohortOwner(tx, current.cursor, current.upperBound)
      if ((next?.userId ?? null) !== (candidate?.userId ?? null)) return { status: 'conflict' }
      if (next && !accountId) return { status: 'unowned' }
      if (next && accountId && !deleted) {
        const owner = { userId: next.userId, accountId }
        const profiles = await readProfiles(tx, [owner], current.catalog)
        const profile = profiles.get(owner.userId)!
        const view = projectKidsJourney({
          policy: current.sourcePolicy,
          policyVersion: current.expectedVersion,
          catalog: current.catalog,
          milestones: profile.milestones,
          earned: profile.earned,
        })
        await saveEarned(tx, owner, current.expectedVersion, view.earned)
      }
      const cursor = next?.userId ?? current.cursor
      const remaining = await nextCohortOwner(tx, cursor, current.upperBound)
      const [updated] = await tx
        .update(kidsJourneyPreparations)
        .set({
          cursor,
          processed: current.processed + (next ? 1 : 0),
          status: remaining ? 'preparing' : 'ready',
          updatedAt: new Date(),
        })
        .where(eq(kidsJourneyPreparations.id, id))
        .returning()
      return { status: 'advanced', preparation: preparation(updated!) }
    })
  }

  async publishPrepared(input: Parameters<KidsJourneyRepository['publishPrepared']>[0]) {
    const { preparationId, expectedVersion, draftHash, catalogHash } = input
    const actorId = z.uuid().parse(input.actorId)
    return this.db.transaction(async (tx) => {
      await lockPolicy(tx, true)
      const source = await readPolicy(tx)
      const [row] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(eq(kidsJourneyPreparations.id, preparationId))
        .for('update')
      if (!row) return null
      const ready = preparation(row)
      if (ready.expectedVersion !== source.version && ready.status !== 'published') {
        await tx
          .update(kidsJourneyPreparations)
          .set({ status: 'stale', updatedAt: new Date() })
          .where(eq(kidsJourneyPreparations.id, ready.id))
        return null
      }
      if (
        source.version !== expectedVersion ||
        ready.status !== 'ready' ||
        ready.expectedVersion !== source.version ||
        ready.draftHash !== draftHash ||
        ready.catalogHash !== catalogHash
      )
        return null
      if (
        hash(ready.candidatePolicy) !== ready.draftHash ||
        hash(ready.sourcePolicy) !== hash(source.policy) ||
        hash(await readCatalog(tx)) !== ready.catalogHash
      ) {
        await tx
          .update(kidsJourneyPreparations)
          .set({ status: 'stale', updatedAt: new Date() })
          .where(eq(kidsJourneyPreparations.id, ready.id))
        return null
      }
      const now = new Date()
      const version = source.version + 1
      const changed =
        source.version === 0
          ? await tx
              .insert(kidsJourneyPolicy)
              .values({ id: 'kids', version, policy: ready.candidatePolicy, updatedAt: now })
              .onConflictDoNothing()
              .returning({ version: kidsJourneyPolicy.version })
          : await tx
              .update(kidsJourneyPolicy)
              .set({ version, policy: ready.candidatePolicy, updatedAt: now })
              .where(
                and(
                  eq(kidsJourneyPolicy.id, 'kids'),
                  eq(kidsJourneyPolicy.version, source.version),
                ),
              )
              .returning({ version: kidsJourneyPolicy.version })
      if (!changed.length) return null
      await tx.insert(kidsJourneyRevisions).values({
        version,
        previousVersion: source.version,
        preparationId: ready.id,
        policy: ready.candidatePolicy,
        draftHash: ready.draftHash,
        catalogHash: ready.catalogHash,
        actorId,
        reason: ready.reason,
        createdAt: now,
      })
      await tx
        .update(kidsJourneyPreparations)
        .set({ status: 'published', updatedAt: now })
        .where(eq(kidsJourneyPreparations.id, ready.id))
      return { version, policy: ready.candidatePolicy, updatedAt: now }
    })
  }

  async listHistory(beforeVersion?: number, limit = 25) {
    const count = z.number().int().min(1).max(100).parse(limit)
    if (beforeVersion !== undefined) z.number().int().min(1).parse(beforeVersion)
    const rows = await this.db
      .select()
      .from(kidsJourneyRevisions)
      .where(
        beforeVersion === undefined ? undefined : lt(kidsJourneyRevisions.version, beforeVersion),
      )
      .orderBy(desc(kidsJourneyRevisions.version))
      .limit(count)
    return rows.map((row) => ({
      ...row,
      policy: KidsJourneyPolicySchema.parse(row.policy),
      updatedAt: row.createdAt,
    }))
  }
}
