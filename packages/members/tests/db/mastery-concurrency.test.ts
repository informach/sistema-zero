import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { sql } from 'drizzle-orm'
import { creatorCurriculumFixture } from '../../../core/tests/fixtures/creator-curriculum'
import type {
  MasteryAwardRecord,
  MasterySubmissionRecord,
} from '../../src/domain/ports/mastery-repository.port'
import {
  captureAdultJourneyBeforeChange,
  lockAdultJourneyCaptureSources,
} from '../../src/infrastructure/persistence/drizzle/adult-journey-capture'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleMasteryRepository } from '../../src/infrastructure/persistence/drizzle/mastery.repository'
import {
  accountDeletionFences,
  adultJourneyPolicy,
  kidsJourneyPolicy,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.MASTERY_CONCURRENCY_TEST_DATABASE_URL
describe.skipIf(!target)('Maestria authorization and purge ordering in PostgreSQL', () => {
  let connection: DbConnection
  let repository: DrizzleMasteryRepository
  const curriculum = creatorCurriculumFixture()
  const adultPolicy = { schemaVersion: 1 as const, stages: [], curriculum }
  const now = new Date('2026-10-25T23:00:00Z')
  beforeAll(async () => {
    connection = await openKidsJourneyTestDatabase(target!)
    repository = new DrizzleMasteryRepository(connection.db)
    const [present] =
      await connection.sql`select exists(select 1 from members.adult_journey_policy) as present`
    if (present?.present)
      throw new Error('Use a fresh dedicated kids_journey_* database for this causal test suite')
    await connection.db
      .insert(adultJourneyPolicy)
      .values({ id: 'adult', version: 1, policy: adultPolicy, updatedAt: now })
    await connection.db
      .insert(kidsJourneyPolicy)
      .values({
        id: 'kids',
        version: 1,
        phase: 'published',
        policy: { ...initialKidsJourneyPolicy(), curriculum },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: kidsJourneyPolicy.id,
        set: {
          version: 1,
          phase: 'published',
          policy: { ...initialKidsJourneyPolicy(), curriculum },
          updatedAt: now,
        },
      })
  }, 60000)
  afterAll(async () => {
    await connection?.close()
  })

  function candidate(audience: 'kids' | 'adult'): MasterySubmissionRecord {
    const accountId = randomUUID()
    return {
      id: randomUUID(),
      userId: audience === 'kids' ? randomUUID() : accountId,
      accountId,
      audience,
      masteryId: 'python2d',
      level: 1,
      areaTitle: 'Python 2D',
      policyVersion: 1,
      definition: structuredClone(curriculum.masteries[0]!.levels[0]!),
      message: null,
      submittedAt: now,
      evidence: {
        id: randomUUID(),
        lessonId: randomUUID(),
        title: 'Meu projeto',
        kind: 'studio',
        revision: 'retained-v1',
        payload: { project: { name: 'Snapshot preservado' } },
        createdAt: now,
      },
    }
  }
  async function approved(audience: 'kids' | 'adult'): Promise<MasteryAwardRecord> {
    const submission = await repository.submit(candidate(audience))
    const reviewId = randomUUID()
    expect(
      await repository.review({
        id: reviewId,
        submissionId: submission.id,
        reviewerId: randomUUID(),
        reviewedAt: now,
        feedback: 'Projeto aprovado.',
        credits: [],
        criteria: submission.definition.rubric.criteria.map((criterion) => ({
          criterionId: criterion.id,
          result: 'approved' as const,
          feedback: '',
        })),
      }),
    ).toBe(true)
    return {
      userId: submission.userId,
      accountId: submission.accountId,
      audience,
      masteryId: submission.masteryId,
      level: submission.level,
      submissionId: submission.id,
      reviewId,
      capabilities: [],
      awardedAt: now,
    }
  }
  async function waitForLock(table: string, mode: string) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const [row] =
        await connection.sql`select exists(select 1 from pg_locks where database=(select oid from pg_database where datname=current_database()) and not granted and relation=to_regclass(${`members.${table}`}) and mode=${mode}) as waiting`
      if (row?.waiting) return
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`Expected a blocked ${mode} on ${table}`)
  }

  test('concurrent first deliveries keep one persisted definition before evidence/rubric deduplication', async () => {
    const old = candidate('adult')
    const changed = {
      ...structuredClone(old),
      id: randomUUID(),
      policyVersion: 2,
      areaTitle: 'Área revisada',
      definition: {
        ...old.definition,
        title: 'Novo núcleo',
        rubric: { ...old.definition.rubric, version: 2 },
      },
    }
    const [one, two] = await Promise.all([repository.submit(old), repository.submit(changed)])
    expect(one.id).toBe(two.id)
    expect(one.definition).toEqual(two.definition)
    const next = await repository.submit({
      ...changed,
      id: randomUUID(),
      evidence: { ...changed.evidence, id: randomUUID() },
      submittedAt: new Date(now.getTime() + 1000),
    })
    expect(next.definition).toEqual(one.definition)
    expect(next.policyVersion).toBe(one.policyVersion)
    expect(next.areaTitle).toBe(one.areaTitle)
  })

  test('Kids award waits for policy publication, defers stale/paused decisions and preserves the committed review', async () => {
    const record = await approved('kids')
    let awarded: ReturnType<typeof repository.award> | undefined
    await connection.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended('kids-journey-policy', 0))`,
      )
      awarded = repository.award(record, { policyVersion: 1 })
      // The account lock shows the award started, then it must wait for our policy lock.
      for (let attempt = 0; attempt < 200; attempt++) {
        const [row] =
          await connection.sql`select exists(select 1 from pg_locks where database=(select oid from pg_database where datname=current_database()) and locktype='advisory' and not granted) as waiting`
        if (row?.waiting) break
        if (attempt === 199) throw new Error('Award did not wait on the Kids policy fence')
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
      await tx
        .update(kidsJourneyPolicy)
        .set({ version: 2, policy: { ...initialKidsJourneyPolicy(), mode: 'paused', curriculum } })
    })
    expect(await awarded!).toEqual({ status: 'deferred' })
    expect(await repository.award(record, { policyVersion: 2 })).toEqual({ status: 'deferred' })
    expect(await repository.findReview(record.submissionId)).not.toBeNull()
    expect(await repository.listAwards(record)).toEqual([])
    await connection.db
      .update(kidsJourneyPolicy)
      .set({ version: 3, policy: { ...initialKidsJourneyPolicy(), curriculum } })
    expect((await repository.award(record, { policyVersion: 3 })).status).toBe('saved')
    expect((await repository.award(record, { policyVersion: 3 })).status).toBe('existing')
  })

  test('adult award waits before taking policy row lock and rejects an outgoing authorization', async () => {
    const record = await approved('adult')
    let awarded: ReturnType<typeof repository.award> | undefined
    await connection.db.transaction(async (tx) => {
      await lockAdultJourneyCaptureSources(tx)
      awarded = repository.award(record, { policyVersion: 1 })
      await waitForLock('mastery_awards', 'RowExclusiveLock')
      await tx.update(adultJourneyPolicy).set({ version: 2 })
    })
    expect(await awarded!).toEqual({ status: 'deferred' })
    expect(await repository.listAwards(record)).toEqual([])
    expect((await repository.award(record, { policyVersion: 2 })).status).toBe('saved')
  })

  test('purge writes its deletion fence before touching awards, so outgoing adult capture cannot deadlock or resurrect a learner', async () => {
    const record = await approved('adult')
    expect((await repository.award(record, { policyVersion: 2 })).status).toBe('saved')
    const purge = new DrizzleUserDataPurgeRepository(connection.db)
    let deleted: Promise<void> | undefined
    await connection.db.transaction(async (tx) => {
      // Stop at the first table in the real capture order, then start deletion.
      await tx.execute(sql`lock table ${accountDeletionFences} in share mode`)
      deleted = purge.purgeForUser({
        accountId: record.accountId,
        userIds: [record.userId],
        cleanup: {
          id: randomUUID(),
          prefixes: [`creations/${record.userId}/`],
          notBefore: now,
          createdAt: now,
        },
      })
      await waitForLock('account_deletion_fences', 'RowExclusiveLock')
      // With the old order this waits on awards already deleted by purge while purge waits on us.
      await lockAdultJourneyCaptureSources(tx)
      await captureAdultJourneyBeforeChange(tx, { version: 2, policy: adultPolicy }, now)
    })
    await deleted!
    expect(await purge.isFenced(record.accountId)).toBe(true)
    expect(await repository.list(record)).toEqual({ submissions: [], reviews: [], awards: [] })
    const [remaining] =
      await connection.sql`select (select count(*)::int from members.creator_journey_course_grants where account_id=${record.accountId}) + (select count(*)::int from members.adult_journey_grants where user_id=${record.userId}) as count`
    expect(remaining?.count).toBe(0)
    expect(await repository.award(record, { policyVersion: 2 })).toEqual({ status: 'deferred' })
  })
})
