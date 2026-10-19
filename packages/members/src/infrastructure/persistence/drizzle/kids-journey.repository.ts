import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { createHash, randomUUID } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  analyzeKidsJourneyReadiness,
  COURSE_JOURNEY_ROLES,
  initialKidsJourneyPolicy,
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  KIDS_CREATOR_CAPABILITIES,
  type KidsJourneyEarned,
  KidsJourneyEarnedSchema,
  type KidsJourneyPolicy,
  KidsJourneyPolicySchema,
  pauseKidsJourneyPolicy,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { and, asc, desc, eq, exists, gt, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { COURSE_LEVELS, COURSE_TRACKS } from '../../../domain/course/course'
import {
  KidsJourneyInitializingError,
  KidsJourneyUnavailableError,
} from '../../../domain/kids-journey/kids-journey.errors'
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
import { withKidsJourneyCatalogPublicationFence } from './kids-journey-catalog-fence'
import { type KidsJourneyEventFact, kidsMilestonesFromEvents } from './kids-journey-facts'
import { lockLearningOwner } from './learning-owner-lock'
import { lessonContentAvailable } from './lesson-availability'
import {
  activeLessonBlocks,
  courses,
  gamificationProfiles,
  kidsJourneyEarned,
  kidsJourneyPolicy,
  kidsJourneyPreparationOwners,
  kidsJourneyPreparations,
  kidsJourneyRevisions,
  lessons,
  xpEvents,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type PreparationRow = typeof kidsJourneyPreparations.$inferSelect
const OwnerSchema = z.strictObject({ userId: IdentityUuidSchema, accountId: IdentityUuidSchema })
const captureUuid = IdentityUuidSchema
const AuthCaptureSchema = z
  .strictObject({ upperBound: captureUuid.nullable(), cursor: captureUuid.nullable() })
  .refine(
    (capture) =>
      capture.upperBound === null
        ? capture.cursor === null
        : capture.cursor === null || capture.cursor <= capture.upperBound,
    'Auth capture cursor exceeds its work bound',
  )
const EarnedSchema = KidsJourneyEarnedSchema
const ActorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('system') }),
  z.strictObject({ kind: z.literal('user'), id: IdentityUuidSchema }),
])
const CatalogCourseSchema = z.strictObject({
  id: IdentityUuidSchema,
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
function emptyEarned(): KidsJourneyEarned {
  return { level: 'noob', capabilities: [], courseAccess: { entry: [], expanded: [], reward: [] } }
}

function orderedEarned(input: unknown): KidsJourneyEarned {
  const earned = EarnedSchema.parse(input)
  return {
    ...earned,
    capabilities: KIDS_CREATOR_CAPABILITIES.filter((capability) =>
      earned.capabilities.includes(capability),
    ),
    courseAccess: {
      entry: JOURNEY_COURSE_TIERS.filter((tier) => earned.courseAccess.entry.includes(tier)),
      expanded: JOURNEY_COURSE_TIERS.filter((tier) => earned.courseAccess.expanded.includes(tier)),
      reward: JOURNEY_COURSE_TIERS.filter((tier) => earned.courseAccess.reward.includes(tier)),
    },
  }
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

async function readPolicy(
  tx: Transaction,
  allowInitializing = false,
): Promise<KidsJourneyPolicyRecord> {
  const [row] = await tx.select().from(kidsJourneyPolicy).where(eq(kidsJourneyPolicy.id, 'kids'))
  if (!row) throw new KidsJourneyUnavailableError()
  if (
    (row.phase !== 'published' || row.version < 1) &&
    (!allowInitializing || row.phase !== 'initializing' || row.version !== 0)
  )
    throw row.phase === 'initializing'
      ? new KidsJourneyInitializingError()
      : new KidsJourneyUnavailableError()
  const parsed = KidsJourneyPolicySchema.safeParse(row.policy)
  if (!parsed.success) throw new KidsJourneyUnavailableError(parsed.error)
  return {
    phase: row.phase,
    version: row.version,
    policy: parsed.data,
    updatedAt: row.updatedAt,
  }
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
    earnedRows.map((earned) => [
      earned.userId,
      orderedEarned({
        level: earned.level,
        capabilities: earned.capabilities,
        courseAccess: {
          entry: earned.entryTiers,
          expanded: earned.expandedTiers,
          reward: earned.rewardTiers,
        },
      }),
    ]),
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
          registered: earnedById.has(owner.userId),
          earned: earnedById.get(owner.userId) ?? emptyEarned(),
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
    .values({
      ...owner,
      level: earned.level,
      capabilities: earned.capabilities,
      entryTiers: [...earned.courseAccess.entry],
      expandedTiers: [...earned.courseAccess.expanded],
      rewardTiers: [...earned.courseAccess.reward],
      policyVersion: version,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: kidsJourneyEarned.userId,
      set: {
        level: sql`case when array_position(${levelOrder}, excluded.level) > array_position(${levelOrder}, ${kidsJourneyEarned.level}) then excluded.level else ${kidsJourneyEarned.level} end`,
        capabilities: sql`(select coalesce(jsonb_agg(distinct value order by value), '[]'::jsonb) from jsonb_array_elements_text(${kidsJourneyEarned.capabilities} || excluded.capabilities) as expanded(value))`,
        entryTiers: sql`array(select distinct value from unnest(${kidsJourneyEarned.entryTiers} || excluded.entry_tiers) as rights(value) order by value)`,
        expandedTiers: sql`array(select distinct value from unnest(${kidsJourneyEarned.expandedTiers} || excluded.expanded_tiers) as rights(value) order by value)`,
        rewardTiers: sql`array(select distinct value from unnest(${kidsJourneyEarned.rewardTiers} || excluded.reward_tiers) as rights(value) order by value)`,
        policyVersion: sql`greatest(${kidsJourneyEarned.policyVersion}, excluded.policy_version)`,
        updatedAt: sql`greatest(${kidsJourneyEarned.updatedAt}, excluded.updated_at)`,
      },
      setWhere: eq(kidsJourneyEarned.accountId, owner.accountId),
    })
}

/** Each indexed source contributes at most one candidate; no population-wide UNION DISTINCT. */
function memberCohortCandidates(
  cursor: string | null,
  upperBound: string | null,
  descending = false,
) {
  const direction = descending ? sql`desc` : sql`asc`
  const xpAfter = cursor ? sql`and ${xpEvents.userId} > ${cursor}::uuid` : sql``
  const xpBefore = upperBound ? sql`and ${xpEvents.userId} <= ${upperBound}::uuid` : sql``
  const earnedAfter = cursor ? sql`and ${kidsJourneyEarned.userId} > ${cursor}::uuid` : sql``
  const earnedBefore = upperBound
    ? sql`and ${kidsJourneyEarned.userId} <= ${upperBound}::uuid`
    : sql``
  const profileAfter = cursor ? sql`and ${gamificationProfiles.userId} > ${cursor}::uuid` : sql``
  const profileBefore = upperBound
    ? sql`and ${gamificationProfiles.userId} <= ${upperBound}::uuid`
    : sql``
  return sql`(
    (select ${xpEvents.userId} as user_id from ${xpEvents} where ${xpEvents.audience} = 'kids'
      and ${xpEvents.sourceType} in ('course_complete','course_showcased') ${xpAfter} ${xpBefore}
      order by ${xpEvents.userId} ${direction} limit 1)
    union all
    (select ${kidsJourneyEarned.userId} as user_id from ${kidsJourneyEarned} where true ${earnedAfter} ${earnedBefore}
      order by ${kidsJourneyEarned.userId} ${direction} limit 1)
    union all
    (select ${gamificationProfiles.userId} as user_id from ${gamificationProfiles} where ${gamificationProfiles.audience} = 'kids' ${profileAfter} ${profileBefore}
      order by ${gamificationProfiles.userId} ${direction} limit 1)
  )`
}

async function nextCohortOwner(
  tx: Transaction,
  preparationId: string,
  cursor: string | null,
  upperBound: string | null,
) {
  if (!upperBound) return null
  const rows = await tx
    .select({
      userId: kidsJourneyPreparationOwners.userId,
      accountId: kidsJourneyPreparationOwners.accountId,
    })
    .from(kidsJourneyPreparationOwners)
    .where(
      and(
        eq(kidsJourneyPreparationOwners.preparationId, preparationId),
        sql`${kidsJourneyPreparationOwners.userId} <= ${upperBound}::uuid`,
        cursor ? gt(kidsJourneyPreparationOwners.userId, cursor) : undefined,
      ),
    )
    .orderBy(asc(kidsJourneyPreparationOwners.userId))
    .limit(1)
  return rows[0] ?? null
}

function preparation(row: PreparationRow): KidsJourneyPreparation {
  return {
    ...row,
    authCapture: AuthCaptureSchema.nullable().parse(row.authCapture),
    sourcePolicy: KidsJourneyPolicySchema.parse(row.sourcePolicy),
    candidatePolicy: KidsJourneyPolicySchema.parse(row.candidatePolicy),
    catalog: CatalogSchema.parse(row.catalog),
    status: z.enum(KIDS_JOURNEY_PREPARATION_STATUSES).parse(row.status),
  }
}

async function insertPreparation(
  tx: Transaction,
  source: KidsJourneyPolicyRecord,
  candidatePolicy: KidsJourneyPolicy,
  actorId: string | null,
  reason: string,
  capturedCatalog?: KidsJourneyCatalogCourse[],
) {
  const catalog = capturedCatalog ?? (await readCatalog(tx))
  const now = new Date()
  const seed = source.phase === 'initializing'
  const [last] = seed
    ? []
    : await tx
        .select({ userId: kidsJourneyEarned.userId })
        .from(kidsJourneyEarned)
        .orderBy(desc(kidsJourneyEarned.userId))
        .limit(1)
  const [row] = await tx
    .insert(kidsJourneyPreparations)
    .values({
      id: randomUUID(),
      expectedVersion: source.version,
      sourcePolicy: source.policy,
      candidatePolicy,
      draftHash: hash(candidatePolicy),
      catalogHash: hash(catalog),
      cohortHash: null,
      catalog,
      origin: seed ? 'seed' : 'configuration',
      actorKind: seed ? 'system' : 'user',
      actorId,
      captureStage: seed ? 'auth' : 'members',
      captureCursor: null,
      cursor: null,
      upperBound: last?.userId ?? null,
      processed: 0,
      status: 'capturing',
      reason,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return preparation(row!)
}

async function insertCohortOwner(
  tx: Transaction,
  preparationId: string,
  userId: string,
  accountId: string | null,
) {
  const rows = await tx
    .insert(kidsJourneyPreparationOwners)
    .values({ preparationId, userId, accountId })
    .onConflictDoUpdate({
      target: [kidsJourneyPreparationOwners.preparationId, kidsJourneyPreparationOwners.userId],
      set: {
        accountId: sql`coalesce(${kidsJourneyPreparationOwners.accountId}, excluded.account_id)`,
      },
      setWhere: sql`${kidsJourneyPreparationOwners.accountId} is null or excluded.account_id is null or ${kidsJourneyPreparationOwners.accountId} = excluded.account_id`,
    })
    .returning({ userId: kidsJourneyPreparationOwners.userId })
  if (!rows.length) throw new Error('Conflicting Kids journey cohort owners')
}

async function nextMemberOwner(tx: Transaction, current: KidsJourneyPreparation) {
  if (!current.upperBound) return null
  if (current.origin === 'configuration') {
    const [row] = await tx
      .select({ userId: kidsJourneyEarned.userId, accountId: kidsJourneyEarned.accountId })
      .from(kidsJourneyEarned)
      .where(
        and(
          sql`${kidsJourneyEarned.userId} <= ${current.upperBound}::uuid`,
          current.captureCursor ? gt(kidsJourneyEarned.userId, current.captureCursor) : undefined,
        ),
      )
      .orderBy(asc(kidsJourneyEarned.userId))
      .limit(1)
    return row ?? null
  }
  const [row] = await tx.execute<{
    userId: string
    capturedAccountId: string | null
    profileAccountId: string | null
    earnedAccountId: string | null
  }>(sql`select cohort.user_id as "userId", ${kidsJourneyPreparationOwners.accountId} as "capturedAccountId", ${gamificationProfiles.accountId} as "profileAccountId", ${kidsJourneyEarned.accountId} as "earnedAccountId"
    from ${memberCohortCandidates(current.captureCursor, current.upperBound)} cohort left join ${gamificationProfiles} on ${gamificationProfiles.userId} = cohort.user_id and ${gamificationProfiles.audience} = 'kids'
    left join ${kidsJourneyEarned} on ${kidsJourneyEarned.userId} = cohort.user_id
    left join ${kidsJourneyPreparationOwners} on ${kidsJourneyPreparationOwners.preparationId} = ${current.id}::uuid and ${kidsJourneyPreparationOwners.userId} = cohort.user_id
    order by cohort.user_id limit 1`)
  if (!row) return null
  const accounts = new Set(
    [row.capturedAccountId, row.profileAccountId, row.earnedAccountId].filter(
      (accountId): accountId is string => accountId !== null,
    ),
  )
  if (accounts.size > 1) throw new Error('Conflicting Kids journey owners')
  return {
    userId: row.userId,
    accountId: row.capturedAccountId ?? row.earnedAccountId ?? row.profileAccountId,
  }
}

/** Shared projection/materialization for admission and a committed course milestone. */
async function reconcileProfile(
  tx: Transaction,
  owner: KidsJourneyOwner,
  policy: KidsJourneyPolicyRecord,
): Promise<void> {
  const catalog = await readCatalog(tx)
  const profile = (await readProfiles(tx, [owner], catalog)).get(owner.userId)!
  const view = projectKidsJourney({
    policy: policy.policy,
    policyVersion: policy.version,
    catalog,
    earned: profile.earned,
    milestones: profile.milestones,
  })
  await saveEarned(tx, owner, policy.version, view.earned)
}

/**
 * Called BEFORE inserting a Kids course milestone, on the award's own connection/TX.
 * Hold account/fence → owner → gamification → shared policy until ledger+earned commit.
 * The returned reconciliation also runs on replay; it does not start another transaction.
 * V0 is the explicit persisted seed during controlled bootstrap, never a missing-policy fallback.
 */
export async function beginKidsJourneyMilestone(
  tx: Transaction,
  inputOwner: KidsJourneyOwner,
): Promise<() => Promise<void>> {
  const owner = OwnerSchema.parse(inputOwner)
  await lockLearningOwner(tx, owner)
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${owner.userId}`}, 0))`,
  )
  await lockPolicy(tx)
  const policy = await readPolicy(tx, true)
  return () => reconcileProfile(tx, owner, policy)
}

export class DrizzleKidsJourneyRepository implements KidsJourneyRepository {
  constructor(private readonly db: Database) {}

  async initializeSeed() {
    return this.db.transaction(async (tx) => {
      await lockPolicy(tx, true)
      const [existing] = await tx
        .select({ id: kidsJourneyPolicy.id })
        .from(kidsJourneyPolicy)
        .limit(1)
      if (existing) return readPolicy(tx, true)
      const [history] = await tx.execute<{ present: boolean }>(sql`select (
        exists(select 1 from ${kidsJourneyRevisions}) or exists(select 1 from ${kidsJourneyPreparations}) or exists(select 1 from ${kidsJourneyEarned})
      ) as present`)
      if (history?.present) throw new Error('Missing Kids policy after initialization')
      await tx.insert(kidsJourneyPolicy).values({
        id: 'kids',
        phase: 'initializing',
        version: 0,
        policy: initialKidsJourneyPolicy(),
        updatedAt: new Date(),
      })
      return readPolicy(tx, true)
    })
  }

  async createSeedPreparation() {
    return this.db.transaction(async (tx) => {
      await lockPolicy(tx, true)
      const source = await readPolicy(tx, true)
      if (source.phase !== 'initializing') return null
      if (hash(source.policy) !== hash(initialKidsJourneyPolicy()))
        throw new Error('Initial Kids seed does not match the provisioning artifact')
      const [existing] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(
          and(
            eq(kidsJourneyPreparations.origin, 'seed'),
            inArray(kidsJourneyPreparations.status, ['capturing', 'preparing', 'ready']),
          ),
        )
        .orderBy(desc(kidsJourneyPreparations.createdAt))
        .limit(1)
      if (existing) return preparation(existing)
      return insertPreparation(
        tx,
        source,
        source.policy,
        null,
        'Carga inicial das regras Kids atuais',
      )
    })
  }

  async startSeedOwnerCapture(id: string, upperBoundInput: string | null) {
    const upperBound = captureUuid.nullable().parse(upperBoundInput)
    return this.db.transaction(async (tx) => {
      await lockPolicy(tx)
      const source = await readPolicy(tx, true)
      const [row] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(eq(kidsJourneyPreparations.id, id))
        .for('update')
      if (
        source.phase !== 'initializing' ||
        row?.origin !== 'seed' ||
        row.status !== 'capturing' ||
        row.captureStage !== 'auth'
      )
        return null
      if (row.authCapture !== null) return preparation(row)
      const [updated] = await tx
        .update(kidsJourneyPreparations)
        .set({ authCapture: { upperBound, cursor: null }, updatedAt: new Date() })
        .where(eq(kidsJourneyPreparations.id, id))
        .returning()
      return preparation(updated!)
    })
  }

  async appendSeedOwner(input: Parameters<KidsJourneyRepository['appendSeedOwner']>[0]) {
    const preparationId = captureUuid.parse(input.preparationId)
    const expectedCursor = captureUuid.nullable().parse(input.expectedCursor)
    const parsedOwner = OwnerSchema.parse(input.owner)
    const owner = {
      userId: parsedOwner.userId.toLowerCase(),
      accountId: parsedOwner.accountId.toLowerCase(),
    }
    return this.db.transaction(async (tx) => {
      let deleted = false
      try {
        await lockLearningOwner(tx, owner)
      } catch (error) {
        if (error instanceof ForbiddenError) deleted = true
        else throw error
      }
      await lockPolicy(tx)
      const source = await readPolicy(tx, true)
      const [row] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(eq(kidsJourneyPreparations.id, preparationId))
        .for('update')
      if (
        source.phase !== 'initializing' ||
        row?.origin !== 'seed' ||
        row.status !== 'capturing' ||
        row.captureStage !== 'auth'
      )
        return null
      const capture = AuthCaptureSchema.nullable().parse(row.authCapture)
      if (
        !capture ||
        capture.upperBound === null ||
        capture.cursor !== expectedCursor ||
        owner.userId > capture.upperBound ||
        (capture.cursor !== null && owner.userId <= capture.cursor)
      )
        return null
      if (!deleted) {
        await readOwnedEarned(tx, [owner])
        await insertCohortOwner(tx, preparationId, owner.userId, owner.accountId)
      }
      const [updated] = await tx
        .update(kidsJourneyPreparations)
        .set({ authCapture: { ...capture, cursor: owner.userId }, updatedAt: new Date() })
        .where(eq(kidsJourneyPreparations.id, preparationId))
        .returning()
      return preparation(updated!)
    })
  }

  async sealSeedOwners(id: string, cursorInput: string | null) {
    const expectedCursor = captureUuid.nullable().parse(cursorInput)
    return this.db.transaction(async (tx) => {
      await lockPolicy(tx)
      if ((await readPolicy(tx, true)).phase !== 'initializing') return null
      const [row] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(eq(kidsJourneyPreparations.id, id))
        .for('update')
      if (row?.origin !== 'seed' || row.status !== 'capturing') return null
      if (row.captureStage !== 'auth') return preparation(row)
      const authCapture = AuthCaptureSchema.nullable().parse(row.authCapture)
      if (!authCapture || authCapture.cursor !== expectedCursor) return null
      const [last] = await tx.execute<{ userId: string }>(
        sql`select user_id as "userId" from ${memberCohortCandidates(null, null, true)} cohort order by user_id desc limit 1`,
      )
      const [updated] = await tx
        .update(kidsJourneyPreparations)
        .set({
          captureStage: 'members',
          captureCursor: null,
          upperBound: last?.userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(kidsJourneyPreparations.id, id))
        .returning()
      return preparation(updated!)
    })
  }

  async advanceCapture(
    id: string,
    expectedStage: KidsJourneyPreparation['captureStage'],
    expectedCursor: string | null,
  ) {
    const initial = await this.getPreparation(id)
    if (
      initial?.status !== 'capturing' ||
      initial.captureStage !== expectedStage ||
      initial.captureCursor !== expectedCursor ||
      expectedStage === 'auth' ||
      expectedStage === 'done'
    )
      return null
    const candidate =
      expectedStage === 'members'
        ? await this.db.transaction((tx) => nextMemberOwner(tx, initial))
        : null
    if (candidate && !candidate.accountId)
      throw new Error('Kids journey cohort owner could not be resolved')
    return this.db.transaction(async (tx) => {
      let deleted = false
      if (candidate?.accountId) {
        try {
          await lockLearningOwner(tx, { userId: candidate.userId, accountId: candidate.accountId })
        } catch (error) {
          if (error instanceof ForbiddenError) deleted = true
          else throw error
        }
      }
      await lockPolicy(tx)
      const source = await readPolicy(tx, true)
      const [row] = await tx
        .select()
        .from(kidsJourneyPreparations)
        .where(eq(kidsJourneyPreparations.id, id))
        .for('update')
      if (
        row?.status !== 'capturing' ||
        row.captureStage !== expectedStage ||
        row.captureCursor !== expectedCursor
      )
        return null
      const current = preparation(row)
      if (source.version !== current.expectedVersion) {
        await tx
          .update(kidsJourneyPreparations)
          .set({ status: 'stale', updatedAt: new Date() })
          .where(eq(kidsJourneyPreparations.id, id))
        return null
      }
      if (expectedStage === 'members') {
        const next = await nextMemberOwner(tx, current)
        if (next?.userId !== candidate?.userId || next?.accountId !== candidate?.accountId)
          return null
        if (next && !deleted) await insertCohortOwner(tx, id, next.userId, next.accountId)
        const [updated] = await tx
          .update(kidsJourneyPreparations)
          .set({
            captureStage: next ? 'members' : 'hashing',
            captureCursor: next?.userId ?? null,
            cohortHash: next ? null : hash([]),
            updatedAt: new Date(),
          })
          .where(eq(kidsJourneyPreparations.id, id))
          .returning()
        return preparation(updated!)
      }
      const owners = await tx
        .select({
          userId: kidsJourneyPreparationOwners.userId,
          accountId: kidsJourneyPreparationOwners.accountId,
        })
        .from(kidsJourneyPreparationOwners)
        .where(
          and(
            eq(kidsJourneyPreparationOwners.preparationId, id),
            current.captureCursor
              ? gt(kidsJourneyPreparationOwners.userId, current.captureCursor)
              : undefined,
          ),
        )
        .orderBy(asc(kidsJourneyPreparationOwners.userId))
        .limit(50)
      const last = owners.at(-1)
      const [updated] = await tx
        .update(kidsJourneyPreparations)
        .set({
          cohortHash: owners.length ? hash([current.cohortHash, owners]) : current.cohortHash,
          captureCursor: last?.userId ?? current.captureCursor,
          captureStage: owners.length ? 'hashing' : 'done',
          upperBound: owners.length ? current.upperBound : current.captureCursor,
          status: owners.length ? 'capturing' : current.captureCursor ? 'preparing' : 'ready',
          updatedAt: new Date(),
        })
        .where(eq(kidsJourneyPreparations.id, id))
        .returning()
      return preparation(updated!)
    })
  }

  async initializeProfile(inputOwner: KidsJourneyOwner) {
    const owner = OwnerSchema.parse(inputOwner)
    return this.db.transaction(async (tx) => {
      try {
        await lockLearningOwner(tx, owner)
      } catch (error) {
        if (error instanceof ForbiddenError) return null
        throw error
      }
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${owner.userId}`}, 0))`,
      )
      await lockPolicy(tx)
      const policy = await readPolicy(tx, true)
      if (policy.phase !== 'published') return null
      await reconcileProfile(tx, owner, policy)
      return policy
    })
  }

  async listOwners(inputProfileIds: readonly string[]): Promise<readonly KidsJourneyOwner[]> {
    const profileIds = z.array(IdentityUuidSchema).max(200).parse(inputProfileIds)
    if (!profileIds.length) return []
    return this.db
      .select({ userId: kidsJourneyEarned.userId, accountId: kidsJourneyEarned.accountId })
      .from(kidsJourneyEarned)
      .where(inArray(kidsJourneyEarned.userId, profileIds))
      .orderBy(asc(kidsJourneyEarned.userId))
  }

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
      const currentPolicy = await readPolicy(tx, true)
      if (currentPolicy.version !== expectedVersion) return 'conflict' as const
      const frozen = (await readOwnedEarned(tx, [owner])).get(owner.userId) ?? emptyEarned()
      // Pause freezes rank/apps; a real base completion may still expand lesson access.
      let nextEarned = parsed
      if (currentPolicy.policy.mode === 'paused') {
        const catalog = await readCatalog(tx)
        const profile = (await readProfiles(tx, [owner], catalog)).get(owner.userId)!
        nextEarned = projectKidsJourney({
          policy: currentPolicy.policy,
          policyVersion: currentPolicy.version,
          catalog,
          earned: frozen,
          milestones: profile.milestones,
        }).earned
      }
      await saveEarned(tx, owner, expectedVersion, nextEarned)
      return 'frozen' as const
    })
  }

  async createPreparation(input: Parameters<KidsJourneyRepository['createPreparation']>[0]) {
    const { expectedVersion } = input
    const actor = ActorSchema.parse(input.actor)
    if (actor.kind !== 'user') throw new Error('Configuration requires an authenticated user')
    const actorId = actor.id
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
      return insertPreparation(tx, source, candidatePolicy, actorId, reason, catalog)
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
      nextCohortOwner(tx, id, initial.cursor, initial.upperBound),
    )
    return this.db.transaction(async (tx) => {
      const accountId = candidate?.accountId
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
      if ((await readPolicy(tx, true)).version !== current.expectedVersion) {
        await tx
          .update(kidsJourneyPreparations)
          .set({ status: 'stale', updatedAt: new Date() })
          .where(eq(kidsJourneyPreparations.id, id))
        return { status: 'stale' }
      }
      const next = await nextCohortOwner(tx, id, current.cursor, current.upperBound)
      if (
        (next?.userId ?? null) !== (candidate?.userId ?? null) ||
        (next?.accountId ?? null) !== (candidate?.accountId ?? null)
      )
        return { status: 'conflict' }
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
      const remaining = await nextCohortOwner(tx, id, cursor, current.upperBound)
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
    const { preparationId, expectedVersion, draftHash, catalogHash, cohortHash } = input
    const actor = ActorSchema.parse(input.actor)
    const actorId = actor.kind === 'user' ? actor.id : null
    return withKidsJourneyCatalogPublicationFence(this.db, async (tx) => {
      await lockPolicy(tx, true)
      const source = await readPolicy(tx, true)
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
        ready.catalogHash !== catalogHash ||
        ready.cohortHash !== cohortHash ||
        ready.actorKind !== actor.kind ||
        (actor.kind === 'system'
          ? source.phase !== 'initializing' || ready.origin !== 'seed'
          : source.phase !== 'published' || ready.origin !== 'configuration')
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
      const changed = await tx
        .update(kidsJourneyPolicy)
        .set({ phase: 'published', version, policy: ready.candidatePolicy, updatedAt: now })
        .where(
          and(
            eq(kidsJourneyPolicy.id, 'kids'),
            eq(kidsJourneyPolicy.version, source.version),
            eq(kidsJourneyPolicy.phase, source.phase),
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
        cohortHash: ready.cohortHash!,
        actorKind: actor.kind,
        actorId,
        reason: ready.reason,
        createdAt: now,
      })
      await tx
        .update(kidsJourneyPreparations)
        .set({ status: 'published', updatedAt: now })
        .where(eq(kidsJourneyPreparations.id, ready.id))
      return { phase: 'published' as const, version, policy: ready.candidatePolicy, updatedAt: now }
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
      phase: 'published' as const,
      updatedAt: row.createdAt,
    }))
  }
}
