import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { creatorCurriculumFixture } from '../../../core/tests/fixtures/creator-curriculum'
import type {
  MasteryReviewRecord,
  MasterySubmissionRecord,
} from '../../src/domain/ports/mastery-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleMasteryRepository } from '../../src/infrastructure/persistence/drizzle/mastery.repository'
import { adultJourneyPolicy } from '../../src/infrastructure/persistence/drizzle/schema'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.MASTERY_TEST_DATABASE_URL
describe.skipIf(!target)('Maestria: real persistence and concurrent review', () => {
  let connection: DbConnection
  let repository: DrizzleMasteryRepository
  const userId = randomUUID()
  const courseId = randomUUID()
  const moduleId = randomUUID()
  const lessonId = randomUUID()
  const evidenceId = randomUUID()
  const now = new Date('2026-10-25T22:00:00Z')
  const owner = { userId, accountId: userId, audience: 'adult' as const }
  const definition = creatorCurriculumFixture().masteries[0]!.levels[0]!
  beforeAll(async () => {
    connection = await openKidsJourneyTestDatabase(target!)
    repository = new DrizzleMasteryRepository(connection.db)
    await connection.db
      .insert(adultJourneyPolicy)
      .values({
        id: 'adult',
        version: 1,
        policy: { schemaVersion: 1, stages: [], curriculum: creatorCurriculumFixture() },
        updatedAt: now,
      })
      .onConflictDoNothing()
    await connection.sql`insert into members.courses(id,slug,title,status,audience,level,track,created_at,updated_at)
      values(${courseId},${`mastery-${courseId}`},'Jogo','published','adult','iniciante','2d',now(),now())`
    await connection.sql`insert into members.modules(id,course_id,title,created_at,updated_at) values(${moduleId},${courseId},'Módulo',now(),now())`
    await connection.sql`insert into members.lessons(id,module_id,course_id,slug,title,created_at,updated_at) values(${lessonId},${moduleId},${courseId},'projeto','Meu projeto',now(),now())`
    await connection.sql`insert into members.lesson_evidence(id,user_id,account_id,lesson_id,kind,revision,payload,created_at)
      values(${evidenceId},${userId},${userId},${lessonId},'studio','v1','{"project":{"name":"Original"}}',now())`
  }, 60000)
  afterAll(async () => {
    if (!connection) return
    await connection.sql`delete from members.mastery_submissions where account_id=${userId}`
    await connection.sql`delete from members.lesson_evidence where account_id=${userId}`
    await connection.sql`delete from members.courses where id=${courseId}`
    await connection.sql`delete from members.account_deletion_fences where account_id=${userId}`
    await connection.close()
  })
  const make = async (time = now): Promise<MasterySubmissionRecord> => ({
    ...owner,
    id: randomUUID(),
    masteryId: 'python2d',
    level: 1,
    areaTitle: 'Python 2D',
    policyVersion: 1,
    definition,
    evidence: (await repository.findEvidence(owner, evidenceId))!,
    message: null,
    submittedAt: time,
  })
  const review = (submissionId: string): MasteryReviewRecord => ({
    id: randomUUID(),
    submissionId,
    reviewerId: randomUUID(),
    reviewedAt: now,
    feedback: 'Critérios demonstrados no projeto.',
    credits: [],
    criteria: definition.rubric.criteria.map((c) => ({
      criterionId: c.id,
      result: 'approved',
      feedback: '',
    })),
  })
  test('isolates evidence by account, profile and community; concurrent retries save one immutable snapshot', async () => {
    expect(
      await repository.findEvidence({ ...owner, accountId: randomUUID() }, evidenceId),
    ).toBeNull()
    expect(await repository.findEvidence({ ...owner, audience: 'kids' }, evidenceId)).toBeNull()
    const candidate = await make()
    const [first, second] = await Promise.all([
      repository.submit(candidate),
      repository.submit({ ...candidate, id: randomUUID() }),
    ])
    expect(first.id).toBe(second.id)
    await connection.sql`update members.lesson_evidence set payload='{"project":{"name":"Changed"}}' where id=${evidenceId}`
    expect((await repository.findSubmission(first.id))?.evidence.payload).toEqual({
      project: { name: 'Original' },
    })
  })
  test('two reviewers cannot both commit; awards are unique and linked to the approved review', async () => {
    const submitted = (await repository.list(owner)).submissions[0]!
    const one = review(submitted.id)
    const two = review(submitted.id)
    const results = await Promise.all([repository.review(one), repository.review(two)])
    expect(results.filter(Boolean)).toHaveLength(1)
    const accepted = (await repository.findReview(submitted.id))!
    const award = {
      ...owner,
      masteryId: submitted.masteryId,
      level: submitted.level,
      submissionId: submitted.id,
      reviewId: accepted.id,
      capabilities: [],
      awardedAt: now,
    }
    const outcomes = await Promise.all([
      repository.award(award, { policyVersion: 1 }),
      repository.award(award, { policyVersion: 1 }),
    ])
    expect(outcomes.map((result) => result.status).sort()).toEqual(['existing', 'saved'])
    expect((await repository.list(owner)).awards).toHaveLength(1)
    await expect(
      repository.award({ ...award, reviewId: randomUUID() }, { policyVersion: 1 }),
    ).rejects.toThrow('revisão aprovada')
  })
  test('a newer submission replaces only the review queue, never the achievement receipt', async () => {
    const changed = await make(new Date(now.getTime() + 1000))
    changed.evidence.id = randomUUID()
    await repository.submit(changed)
    const queue = await repository.listQueue({
      audience: 'adult',
      status: 'pending',
      limit: 30,
      offset: 0,
    })
    expect(
      queue.filter((row) => row.submission.userId === userId).map((row) => row.submission.id),
    ).toEqual([changed.id])
    expect((await repository.list(owner)).awards).toHaveLength(1)
  })
  test('account erasure fences submission and cascades review/award evidence', async () => {
    await connection.sql`insert into members.account_deletion_fences(account_id,created_at) values(${userId},now())`
    const candidate = await make(new Date(now.getTime() + 2000))
    candidate.evidence.id = randomUUID()
    await expect(repository.submit(candidate)).rejects.toThrow('exclusão')
    await connection.sql`delete from members.mastery_submissions where account_id=${userId}`
    expect(await repository.list(owner)).toEqual({ submissions: [], reviews: [], awards: [] })
  })
})
