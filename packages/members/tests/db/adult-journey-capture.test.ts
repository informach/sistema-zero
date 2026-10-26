import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type AdultJourneyPolicy,
  creatorJourneyCourseIds,
  projectAdultJourney,
  resolveCreatorJourneyCourseLock,
} from '@sistemazero/core/journey'
import { sql } from 'drizzle-orm'
import { creatorCurriculumFixture } from '../../../core/tests/fixtures/creator-curriculum'
import { DrizzleAdultJourneyRepository } from '../../src/infrastructure/persistence/drizzle/adult-journey.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import {
  masteryReviews,
  masterySubmissions,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.KIDS_JOURNEY_TEST_DATABASE_URL
describe.skipIf(!target)('adult outgoing journey capture (real local migrations)', () => {
  let connection: DbConnection
  let repository: DrizzleAdultJourneyRepository
  const quiet = randomUUID()
  const newcomer = randomUUID()
  const deleted = randomUUID()
  const courseA = randomUUID()
  const courseB = randomUUID()
  const now = new Date('2026-10-25T15:00:00Z')
  const policy: AdultJourneyPolicy = {
    schemaVersion: 1,
    stages: [
      {
        id: 'first',
        title: 'Primeiro',
        requirements: [{ courseId: courseA, milestone: 'complete' }],
        capabilities: ['studio'],
      },
      {
        id: 'second',
        title: 'Segundo',
        requirements: [{ courseId: courseB, milestone: 'complete' }],
        capabilities: ['pinta'],
      },
    ],
  }
  beforeAll(async () => {
    connection = await openKidsJourneyTestDatabase(target!)
    repository = new DrizzleAdultJourneyRepository(connection.db)
    const [rows] =
      await connection.sql`select count(*)::int as count from members.adult_journey_policy`
    if (rows?.count)
      throw new Error('This test requires its own empty disposable kids_journey_* database.')
    for (const id of [courseA, courseB])
      await connection.sql`insert into members.courses (id,slug,title,status,audience,level,track,metadata,version,created_at,updated_at)
        values (${id},${`capture-${id}`},'Curso de captura','published','adult','iniciante','2d','{}',1,${now.toISOString()},${now.toISOString()})`
    for (const id of [quiet, newcomer, deleted])
      await connection.sql`insert into members.adult_profiles (user_id,display_name,updated_at) values (${id},'Aluno',${now.toISOString()})`
    for (const userId of [quiet, deleted])
      await connection.sql`insert into members.xp_events (id,user_id,audience,source_type,source_id,amount,created_at)
        values (${randomUUID()},${userId},'adult','course_complete',${courseA},0,${now.toISOString()})`
    await connection.sql`insert into members.account_deletion_fences (account_id,created_at) values (${deleted},${now.toISOString()})`
    await repository.savePolicy(policy, 0, now)
  }, 120_000)
  afterAll(async () => {
    // This explicitly disposable database is left intact for inspection; no shared database reset.
    await connection?.close()
  })

  test('a learner who never requested progress keeps the outgoing rank, capability and course access', async () => {
    expect(await repository.getReached(quiet)).toBeNull()
    expect(await repository.listGranted(quiet)).toEqual([])
    const changed = {
      ...policy,
      stages: policy.stages.map((stage, index) =>
        index
          ? stage
          : {
              ...stage,
              requirements: [
                ...stage.requirements,
                { courseId: courseB, milestone: 'complete' as const },
              ],
            },
      ),
    }
    expect((await repository.savePolicy(changed, 1, now))?.version).toBe(2)
    expect(await repository.getReached(quiet)).toBe(2)
    expect(await repository.listGranted(quiet)).toEqual(['studio'])
    expect(new Set(await repository.listCourseGrants(quiet))).toEqual(new Set([courseA, courseB]))
    expect(new Set(await repository.listCourseGrants(newcomer))).toEqual(
      new Set([courseA, courseB]),
    )
    expect(await repository.getReached(deleted)).toBeNull()
    expect(await repository.listGranted(deleted)).toEqual([])
    expect(await repository.listCourseGrants(deleted)).toEqual([])
    const actual = projectAdultJourney(
      changed,
      2,
      await repository.listMilestones(quiet),
      await repository.listGranted(quiet),
      await repository.getReached(quiet),
    )
    expect(actual.stages[0]!.completed).toBe(true)
  })

  test('two publishers of one expected version have one winner and freeze remains atomic', async () => {
    const result = await Promise.all([
      repository.savePolicy(policy, 2, now),
      repository.savePolicy(policy, 2, now),
    ])
    expect(result.filter(Boolean)).toHaveLength(1)
    expect((await repository.getPolicy())?.version).toBe(3)
    expect(await repository.freezeGranted(quiet, 2, ['ai'], now, null, [randomUUID()])).toBe(false)
    expect(await repository.listGranted(quiet)).not.toContain('ai')
  })

  test('capture does not wait for an account lock held by a learner write', async () => {
    const held = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const writer = connection.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${quiet}`}, 0))`,
      )
      held.resolve()
      await release.promise
      await tx.execute(
        sql`insert into members.xp_events (id,user_id,audience,source_type,source_id,amount,created_at) values (${randomUUID()},${quiet},'adult','course_complete',${courseB},0,${now.toISOString()}) on conflict do nothing`,
      )
    })
    await held.promise
    try {
      expect((await repository.savePolicy(policy, 3, now))?.version).toBe(4)
    } finally {
      release.resolve()
      await writer
    }
    expect(await repository.listMilestones(quiet)).toHaveLength(2)
  }, 10_000)

  test('all owners are captured across multiple bounded pages, including later course completions', async () => {
    const users = Array.from({ length: 501 }, () => randomUUID())
    const profiles = users.map((userId) => ({
      user_id: userId,
      display_name: 'Aluno em lote',
      updated_at: now.toISOString(),
    }))
    await connection.sql`insert into members.adult_profiles ${connection.sql(profiles)}`
    const milestones = users.map((userId) => ({
      id: randomUUID(),
      user_id: userId,
      audience: 'adult',
      source_type: 'course_complete',
      source_id: courseA,
      amount: 0,
      created_at: now.toISOString(),
    }))
    await connection.sql`insert into members.xp_events ${connection.sql(milestones)}`
    expect((await repository.savePolicy({ schemaVersion: 1, stages: [] }, 4, now))?.version).toBe(5)
    const floors = await repository.listReachedForUsers(users)
    expect(floors.size).toBe(501)
    expect([...floors.values()].every((position) => position === 2)).toBe(true)
    expect(await repository.getReached(quiet)).toBe(3)
    expect(new Set(await repository.listGranted(quiet))).toEqual(new Set(['studio', 'pinta']))
  }, 30_000)

  test('editing a completed pair preserves its mission and Power access before promotion', async () => {
    const fixture = creatorCurriculumFixture()
    const curriculum = {
      ...fixture,
      stages: fixture.stages.map((stage, index) =>
        index ? stage : { ...stage, base2dCourseId: courseA, base3dCourseId: courseB },
      ),
    }
    const learner = randomUUID()
    const replacement = randomUUID()
    const draftRows = [
      ...creatorJourneyCourseIds(curriculum).filter((id) => id !== courseA && id !== courseB),
      replacement,
    ].map((id) => ({
      id,
      slug: `draft-${id}`,
      title: 'Conteúdo planejado',
      status: 'draft',
      audience: 'adult',
      level: 'iniciante',
      track: '2d',
      metadata: '{}',
      version: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }))
    await connection.sql`insert into members.courses ${connection.sql(draftRows)}`
    await connection.sql`insert into members.adult_profiles (user_id,display_name,updated_at) values (${learner},'Par concluído',${now.toISOString()})`
    for (const courseId of [courseA, courseB])
      await connection.sql`insert into members.xp_events (id,user_id,audience,source_type,source_id,amount,created_at) values (${randomUUID()},${learner},'adult','course_complete',${courseId},0,${now.toISOString()})`
    expect(
      (await repository.savePolicy({ schemaVersion: 1, stages: [], curriculum }, 5, now))?.version,
    ).toBe(6)
    const changed = {
      ...curriculum,
      stages: curriculum.stages.map((stage, index) =>
        index ? stage : { ...stage, base3dCourseId: replacement },
      ),
    }
    expect(
      (await repository.savePolicy({ schemaVersion: 1, stages: [], curriculum: changed }, 6, now))
        ?.version,
    ).toBe(7)
    const retainedCourseIds = await repository.listCourseGrants(learner)
    const mission = curriculum.stages[0]!.missionCourseId
    expect(retainedCourseIds).toContain(mission)
    expect(retainedCourseIds).toContain(curriculum.stages[0]!.powers[0]!.courseIds[0]!)
    const projected = projectAdultJourney(
      { schemaVersion: 1, stages: [], curriculum: changed },
      7,
      await repository.listMilestones(learner),
      await repository.listGranted(learner),
      await repository.getReached(learner),
      { retainedCourseIds },
    )
    expect(projected.curriculum!.level).toBe('noob')
    expect(projected.curriculum!.stages[0]!.pairCompleted).toBe(false)
    expect(
      resolveCreatorJourneyCourseLock({
        curriculum: changed,
        view: projected.curriculum!,
        courseId: mission,
      }).locked,
    ).toBe(false)
  }, 30_000)

  test('the first curriculum also preserves catalog access for an adult who already existed', async () => {
    const learner = randomUUID()
    const fixture = creatorCurriculumFixture()
    const curriculum = {
      ...fixture,
      stages: fixture.stages.map((stage, index) =>
        index ? stage : { ...stage, base2dCourseId: courseA, base3dCourseId: courseB },
      ),
    }
    await connection.sql`insert into members.adult_profiles (user_id,display_name,updated_at) values (${learner},'Admissão anterior',${now.toISOString()})`
    // Only this test owns the policy in this explicitly disposable database.
    await connection.sql`delete from members.adult_journey_policy`
    expect(
      (await repository.insertPolicyIfAbsent({ schemaVersion: 1, stages: [], curriculum }, now))
        ?.version,
    ).toBe(1)
    expect(new Set(await repository.listCourseGrants(learner))).toEqual(new Set([courseA, courseB]))
    expect(await repository.getReached(learner)).toBeNull()
    expect(await repository.listGranted(learner)).toEqual([])
  }, 30_000)

  test('outgoing capture freezes a credited historical nucleus and open courses before any mastery badge or GET', async () => {
    const learner = randomUUID()
    const current = (await repository.getPolicy())!
    const area = current.policy.curriculum!.masteries.find(
      (mastery) => mastery.id === 'modelagem3d',
    )!
    const definition = { ...area.levels[1]!, grants: ['molda-intermediate' as const] }
    await repository.freezeGranted(learner, current.version, ['molda'], now)
    const submissionId = randomUUID()
    await connection.db.insert(masterySubmissions).values({
      id: submissionId,
      userId: learner,
      accountId: learner,
      audience: 'adult',
      masteryId: area.id,
      level: 2,
      areaTitle: area.title,
      policyVersion: current.version,
      rubricVersion: definition.rubric.version,
      definition,
      evidenceId: randomUUID(),
      evidenceTitle: 'Projeto validado',
      evidenceLessonId: randomUUID(),
      evidenceKind: 'studio',
      evidenceRevision: 'v1',
      evidencePayload: { project: {} },
      evidenceCreatedAt: now,
      message: null,
      submittedAt: now,
    })
    await connection.db.insert(masteryReviews).values({
      id: randomUUID(),
      submissionId,
      reviewerId: randomUUID(),
      reviewedAt: now,
      feedback: 'Núcleo demonstrado; oficinas ainda pendentes.',
      criteria: definition.rubric.criteria.map((criterion) => ({
        criterionId: criterion.id,
        result: 'approved' as const,
        feedback: '',
      })),
      credits: [
        {
          requirementId: 'nucleus',
          reason: 'O projeto demonstra os conceitos completos do núcleo.',
        },
      ],
    })
    const changed = {
      ...current.policy,
      curriculum: {
        ...current.policy.curriculum!,
        masteries: current.policy.curriculum!.masteries.map((mastery) =>
          mastery.id !== area.id
            ? mastery
            : {
                ...mastery,
                opensAfterPair: 'champion' as const,
                levels: mastery.levels.map((level) =>
                  level.level === 2 ? { ...level, nucleusCourseIds: [courseB] } : level,
                ),
              },
        ),
      },
    }
    expect((await repository.savePolicy(changed, current.version, now))?.version).toBe(
      current.version + 1,
    )
    expect(await repository.listGranted(learner)).toContain('molda-intermediate')
    expect(await repository.listCourseGrants(learner)).toContain(definition.nucleusCourseIds[0]!)
    expect(await repository.listCourseGrants(learner)).toContain(
      definition.workshops[0]!.courseIds[0]!,
    )
    const [count] =
      await connection.sql`select count(*)::int as count from members.mastery_awards where user_id=${learner}`
    expect(count?.count).toBe(0)
  }, 30_000)

  test('legacy adult Molda keeps every band while new curriculum learners earn only the taught band', async () => {
    const current = (await repository.getPolicy())!
    const legacy: AdultJourneyPolicy = {
      schemaVersion: 1,
      stages: [
        {
          id: 'molda',
          title: 'Molda legado',
          requirements: [{ courseId: courseA, milestone: 'complete' }],
          capabilities: ['molda'],
        },
      ],
    }
    const legacyPolicy = (await repository.savePolicy(legacy, current.version, now))!
    const learner = randomUUID()
    await connection.sql`insert into members.xp_events (id,user_id,audience,source_type,source_id,amount,created_at)
      values (${randomUUID()},${learner},'adult','course_complete',${courseA},0,${now.toISOString()})`
    expect(await repository.listGranted(learner)).toEqual([])
    const curriculum = {
      ...current.policy.curriculum!,
      stages: current.policy.curriculum!.stages.map((stage, index) =>
        index === 0
          ? {
              ...stage,
              base2dCourseId: courseA,
              base3dCourseId: courseB,
              grants: [
                ...stage.grants,
                { after: 'base3d' as const, capabilities: ['molda' as const] },
              ],
            }
          : stage,
      ),
    }
    const published = (await repository.savePolicy(
      { schemaVersion: 1, stages: [], curriculum },
      legacyPolicy.version,
      now,
    ))!
    expect(new Set(await repository.listGranted(learner))).toEqual(
      new Set(['molda', 'molda-intermediate', 'molda-professional']),
    )
    const fresh = projectAdultJourney(published.policy, published.version, [
      { courseId: courseA, completed: true, showcased: false },
      { courseId: courseB, completed: true, showcased: false },
    ])
    expect(fresh.capabilities).toContain('molda')
    expect(fresh.capabilities).not.toContain('molda-intermediate')
    expect(fresh.capabilities).not.toContain('molda-professional')
  }, 30_000)
})
