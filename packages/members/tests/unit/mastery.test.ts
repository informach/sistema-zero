import { describe, expect, test } from 'bun:test'
import {
  type CreatorJourneyCourseFact,
  type MasteryReviewInput,
  projectCreatorJourney,
} from '@sistemazero/core/journey'
import {
  creatorCatalogFixture,
  creatorCourseId,
  creatorCurriculumFixture,
  creatorPostCompletions,
} from '../../../core/tests/fixtures/creator-curriculum'
import { MasteryService } from '../../src/application/mastery/mastery.service'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import type {
  MasteryAwardRecord,
  MasteryContext,
  MasteryEvidence,
  MasteryOwner,
  MasteryRepository,
  MasteryReviewRecord,
  MasterySubmissionRecord,
} from '../../src/domain/ports/mastery-repository.port'

const owner: MasteryOwner = {
  userId: '20000000-0000-4000-8000-000000000001',
  accountId: '20000000-0000-4000-8000-000000000001',
  audience: 'adult',
}
const reviewerId = '20000000-0000-4000-8000-000000000002'
const evidenceId = '20000000-0000-4000-8000-000000000003'
const now = new Date('2026-10-25T12:00:00Z')
class MemoryMasteries implements MasteryRepository {
  async listAwards(who: MasteryOwner) {
    return this.awards.filter(
      (a) =>
        a.userId === who.userId && a.audience === who.audience && a.accountId === who.accountId,
    )
  }
  submissions: MasterySubmissionRecord[] = []
  reviews: MasteryReviewRecord[] = []
  awards: MasteryAwardRecord[] = []
  deferNextAward: (() => void) | null = null
  evidence: MasteryEvidence = {
    id: evidenceId,
    title: 'Meu jogo',
    lessonId: evidenceId,
    kind: 'studio',
    revision: 'v1',
    payload: { project: { name: 'Meu jogo', code: 'print(1)' } },
    createdAt: now,
  }
  async listEvidence(who: MasteryOwner) {
    return who.userId === owner.userId ? [this.evidence] : []
  }
  async findEvidence(who: MasteryOwner, id: string) {
    return who.userId === owner.userId && id === this.evidence.id
      ? structuredClone(this.evidence)
      : null
  }
  async list(who: MasteryOwner) {
    const submissions = this.submissions.filter(
      (s) =>
        s.userId === who.userId && s.accountId === who.accountId && s.audience === who.audience,
    )
    return {
      submissions,
      reviews: this.reviews.filter((r) => submissions.some((s) => s.id === r.submissionId)),
      awards: this.awards.filter((a) => a.userId === who.userId && a.audience === who.audience),
    }
  }
  async submit(record: MasterySubmissionRecord) {
    const existing = this.submissions.find(
      (s) =>
        s.userId === record.userId &&
        s.masteryId === record.masteryId &&
        s.level === record.level &&
        s.evidence.id === record.evidence.id,
    )
    if (existing) return existing
    this.submissions.push(structuredClone(record))
    return record
  }
  async findSubmission(id: string) {
    return this.submissions.find((s) => s.id === id) ?? null
  }
  async findReview(id: string) {
    return this.reviews.find((r) => r.submissionId === id) ?? null
  }
  async listQueue() {
    return this.submissions.map((submission) => ({
      submission,
      review: this.reviews.find((r) => r.submissionId === submission.id) ?? null,
    }))
  }
  async review(record: MasteryReviewRecord) {
    const current = await this.findSubmission(record.submissionId)
    const latest = this.submissions.findLast(
      (s) =>
        s.userId === current?.userId &&
        s.masteryId === current?.masteryId &&
        s.level === current?.level,
    )
    if (!current || latest?.id !== current.id || (await this.findReview(current.id))) return false
    this.reviews.push(record)
    return true
  }
  async award(record: MasteryAwardRecord, _authorization: { policyVersion: number }) {
    if (this.deferNextAward) {
      this.deferNextAward()
      this.deferNextAward = null
      return { status: 'deferred' as const }
    }
    const existing = this.awards.find(
      (a) =>
        a.userId === record.userId && a.masteryId === record.masteryId && a.level === record.level,
    )
    if (existing) return { status: 'existing' as const, award: existing }
    this.awards.push(record)
    return { status: 'saved' as const, award: record }
  }
}
function setup() {
  const repository = new MemoryMasteries()
  let curriculum = creatorCurriculumFixture()
  let catalog: readonly CreatorJourneyCourseFact[] = creatorCatalogFixture(curriculum, 'adult')
  let requestedHistoricalIds: readonly string[] = []
  const completed = [
    ...creatorPostCompletions(curriculum, 0),
    ...creatorPostCompletions(curriculum, 1),
  ]
  let subscribed = true
  let paused = false
  let earnedLevel: ReturnType<typeof projectCreatorJourney>['level'] = 'noob'
  const retainedCourseIds: string[] = []
  let count = 10
  const entitlement = EntitlementAggregate.grant({
    id: evidenceId,
    userId: owner.accountId,
    productId: evidenceId,
    productKind: 'subscription',
    accessType: 'all_courses',
    courseRef: null,
    offerId: null,
    snapshot: {
      offerId: evidenceId,
      offerSlug: 'assinatura',
      productId: evidenceId,
      sku: 'adult',
      name: 'Assinatura',
      kind: 'subscription',
      accessType: 'all_courses',
      courseRef: null,
      fulfillment: null,
      resolvedAt: now.toISOString(),
    },
    sourceKind: 'subscription',
    sourceId: evidenceId,
    grantedAt: now,
    idempotencyKey: 'mastery-test',
  })
  const context = async (
    _owner: MasteryOwner,
    extraCourseIds: readonly string[] = [],
  ): Promise<MasteryContext> => {
    requestedHistoricalIds = extraCourseIds
    return {
      curriculum,
      catalog,
      policyVersion: 1,
      paused,
      milestones: completed.map((courseId) => ({ courseId, completed: true })),
      view: projectCreatorJourney({
        curriculum,
        completedCourseIds: completed,
        earnedLevel,
        paused,
        masteryAwards: repository.awards,
        retainedCourseIds,
      }),
    }
  }
  const service = new MasteryService(
    repository,
    context,
    { listActiveByUser: async () => (subscribed ? [entitlement] : []) },
    () => new Date(now.getTime() + count++),
    () => `20000000-0000-4000-8000-${String(count++).padStart(12, '0')}`,
  )
  const level = curriculum.masteries[0]!.levels[0]!
  const review: MasteryReviewInput = {
    criteria: level.rubric.criteria.map((c) => ({
      criterionId: c.id,
      result: 'approved',
      feedback: '',
    })),
    feedback: 'O projeto funciona e você explicou a alteração.',
    credits: [],
  }
  return {
    repository,
    service,
    level,
    review,
    complete: (...ids: string[]) => {
      completed.push(...ids)
    },
    replaceCompletions: (...ids: string[]) => {
      completed.splice(0, completed.length, ...ids)
    },
    retain: (...ids: string[]) => {
      retainedCourseIds.push(...ids)
    },
    replaceCatalog: (facts: readonly CreatorJourneyCourseFact[]) => {
      catalog = facts
    },
    requestedHistoricalIds: () => requestedHistoricalIds,
    subscribe: (value: boolean) => {
      subscribed = value
    },
    pause: (value = true) => {
      if (value)
        earnedLevel = projectCreatorJourney({ curriculum, completedCourseIds: completed }).level
      paused = value
    },
    replace: (value: typeof curriculum) => {
      curriculum = value
    },
    curriculum,
  }
}

describe('Maestrias: evidence, review and durable achievement', () => {
  test('approval alone is not a badge; completion and two distinct workshops finish it once', async () => {
    const f = setup()
    const submitted = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    await f.service.review(submitted.id, reviewerId, f.review)
    expect(f.repository.awards).toHaveLength(0)
    f.complete(
      ...f.level.nucleusCourseIds,
      ...f.level.workshops[0]!.courseIds,
      ...f.level.workshops[0]!.courseIds,
    )
    await f.service.get(owner)
    expect(f.repository.awards).toHaveLength(0)
    f.complete(...f.level.workshops[1]!.courseIds)
    const state = await f.service.get(owner)
    expect(state.areas[0]!.levels[0]!.earned).toBe(true)
    expect(state.areas[0]!.levels[1]!.available).toBe(true)
    await f.service.get(owner)
    expect(f.repository.awards).toHaveLength(1)
  })
  test('specific credits need an approved project and a recorded reason', async () => {
    const f = setup()
    const submitted = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    const credits = ['nucleus', ...f.level.workshops.slice(0, 2).map((w) => w.id)].map(
      (requirementId) => ({
        requirementId,
        reason: 'Comportamento demonstrado nesta versão do projeto.',
      }),
    )
    await f.service.review(submitted.id, reviewerId, { ...f.review, credits })
    expect(f.repository.awards).toHaveLength(1)
    expect(f.repository.reviews[0]!.credits).toHaveLength(3)
  })
  test('rejects self-review, missing criteria, fabricated credits and repeat reviews', async () => {
    const f = setup()
    const submitted = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    await expect(f.service.review(submitted.id, owner.accountId, f.review)).rejects.toThrow(
      'outra pessoa',
    )
    await expect(
      f.service.review(submitted.id, reviewerId, {
        ...f.review,
        criteria: f.review.criteria.slice(0, 1),
      }),
    ).rejects.toThrow('todos os critérios')
    await expect(
      f.service.review(submitted.id, reviewerId, {
        ...f.review,
        credits: [{ requirementId: 'invented', reason: 'Uma razão grande o suficiente.' }],
      }),
    ).rejects.toThrow('corresponder')
    await f.service.review(submitted.id, reviewerId, f.review)
    await expect(f.service.review(submitted.id, reviewerId, f.review)).rejects.toThrow(
      'já foi revisada',
    )
  })
  test('immutable project and rubric survive lesson changes and editorial revisions', async () => {
    const f = setup()
    const submitted = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    f.repository.evidence.payload = { project: { name: 'Projeto alterado' } }
    const newer = structuredClone(f.curriculum)
    f.replace({
      ...newer,
      masteries: newer.masteries.map((m) => ({
        ...m,
        levels: m.levels.map((l) => ({
          ...l,
          rubric: { version: 2, criteria: [{ id: 'new', title: 'Outro critério' }] },
        })),
      })),
    })
    expect((await f.service.detail(submitted.id)).evidence.payload).toEqual({
      project: { name: 'Meu jogo', code: 'print(1)' },
    })
    expect((await f.service.get(owner)).areas[0]!.levels[0]!.rubric.version).toBe(1)
    await f.service.review(submitted.id, reviewerId, f.review)
    f.complete(
      ...f.level.nucleusCourseIds,
      ...f.level.workshops.slice(0, 2).flatMap((w) => w.courseIds),
    )
    expect((await f.service.get(owner)).areas[0]!.levels[0]!.earned).toBe(true)
  })
  test('requires ownership, subscription and predecessor for new delivery', async () => {
    const f = setup()
    await expect(
      f.service.submit({ ...owner, userId: reviewerId }, 'python2d', 1, { evidenceId }),
    ).rejects.toThrow('entrega sua')
    await expect(f.service.submit(owner, 'python2d', 2, { evidenceId })).rejects.toThrow(
      'nível anterior',
    )
    f.subscribe(false)
    await expect(f.service.submit(owner, 'python2d', 1, { evidenceId })).rejects.toThrow(
      'assinatura ativa',
    )
  })
  test('pause keeps study and review available, holding new achievements until resumed', async () => {
    const f = setup()
    f.complete(
      ...f.level.nucleusCourseIds,
      ...f.level.workshops.slice(0, 2).flatMap((w) => w.courseIds),
    )
    f.pause()
    const submitted = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    await f.service.review(submitted.id, reviewerId, f.review)
    expect(f.repository.awards).toHaveLength(0)
    f.pause(false)
    expect((await f.service.get(owner)).areas[0]!.levels[0]!.earned).toBe(true)
  })
  test('editing the entry pair, area and level does not revoke an existing submission or admit its next level', async () => {
    const f = setup()
    const entry = f.curriculum.stages[1]!
    f.replaceCompletions(
      ...creatorPostCompletions(f.curriculum, 0),
      entry.base2dCourseId,
      entry.base3dCourseId,
    )
    const first = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    await f.service.review(first.id, reviewerId, {
      ...f.review,
      criteria: f.review.criteria.map((c) => ({
        ...c,
        result: 'revise',
        feedback: 'Explique a regra no projeto.',
      })),
    })
    const changed = {
      ...f.curriculum,
      stages: f.curriculum.stages.map((stage, index) =>
        index === 1 ? { ...stage, base2dCourseId: creatorCourseId(90000) } : stage,
      ),
      masteries: f.curriculum.masteries.map((area, index) =>
        index === 0
          ? {
              ...area,
              opensAfterPair: 'architect' as const,
              levels: area.levels.map((level, levelIndex) =>
                levelIndex === 0
                  ? {
                      ...level,
                      nucleusCourseIds: [creatorCourseId(90001)],
                      rubric: {
                        version: 2,
                        criteria: [{ id: 'new-rule', title: 'Nova exigência editorial' }],
                      },
                    }
                  : level,
              ),
            }
          : area,
      ),
    }
    f.replace(changed)
    const state = await f.service.get(owner)
    expect(state.areas[0]!.available).toBe(true)
    expect(state.areas[0]!.levels[0]!.available).toBe(true)
    expect(state.areas[0]!.levels[0]!.nucleusCourseIds).toEqual(f.level.nucleusCourseIds)
    expect(state.areas[0]!.levels[0]!.rubric.version).toBe(1)
    expect(state.areas[0]!.levels[1]!.available).toBe(false)
    expect(state.areas[1]!.available).toBe(false)
    await expect(f.service.submit(owner, 'python2d', 2, { evidenceId })).rejects.toThrow(
      'nível anterior',
    )
    await expect(f.service.submit(owner, 'python3d', 1, { evidenceId })).rejects.toThrow(
      'nível anterior',
    )
    f.repository.evidence.id = creatorCourseId(90002)
    const resubmitted = await f.service.submit(owner, 'python2d', 1, {
      evidenceId: f.repository.evidence.id,
    })
    expect(resubmitted.rubricVersion).toBe(1)
    f.complete(
      ...f.level.nucleusCourseIds,
      ...f.level.workshops.slice(0, 2).flatMap((w) => w.courseIds),
    )
    f.pause()
    await f.service.review(resubmitted.id, reviewerId, f.review)
    expect(f.repository.awards).toHaveLength(0)
    f.pause(false)
    expect((await f.service.get(owner)).areas[0]!.levels[0]!.earned).toBe(true)
    expect(f.repository.awards).toHaveLength(1)
  })
  test('the mastery hub preserves course grants without treating them as area admission', async () => {
    const f = setup()
    f.replaceCompletions(...creatorPostCompletions(f.curriculum, 0))
    f.retain(...f.level.nucleusCourseIds)
    const state = await f.service.get(owner)
    expect(state.areas[0]!.available).toBe(false)
    expect(state.areas[0]!.levels[0]!.nucleusCourses[0]!.state).toBe('available')
    expect(state.areas[0]!.levels[0]!.nucleusCompleted).toBe(false)
    await expect(f.service.submit(owner, 'python2d', 1, { evidenceId })).rejects.toThrow(
      'nível anterior',
    )
  })
  test('a concurrently deferred award refreshes paused state without undoing the review', async () => {
    const f = setup()
    const submitted = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    await f.service.review(submitted.id, reviewerId, f.review)
    f.complete(
      ...f.level.nucleusCourseIds,
      ...f.level.workshops.slice(0, 2).flatMap((w) => w.courseIds),
    )
    f.repository.deferNextAward = () => f.pause()
    const state = await f.service.get(owner)
    expect(state.areas[0]!.levels[0]!.available).toBe(true)
    expect(state.areas[0]!.levels[0]!.completed).toBe(false)
    expect(state.areas[0]!.levels[0]!.earned).toBe(false)
    expect(state.areas[0]!.levels[1]!.available).toBe(false)
    expect(f.repository.awards).toHaveLength(0)
    expect(f.repository.reviews).toHaveLength(1)
    f.pause(false)
    expect((await f.service.get(owner)).areas[0]!.levels[0]!.earned).toBe(true)
  })
  test('the hub shows real catalog titles and keeps draft, archived and wrong-audience courses unavailable', async () => {
    const f = setup()
    f.replaceCatalog(
      creatorCatalogFixture(f.curriculum, 'adult').map((course) => {
        if (f.level.nucleusCourseIds.includes(course.id))
          return { ...course, title: 'Núcleo em preparação', status: 'draft' }
        if (f.level.workshops[0]!.courseIds.includes(course.id))
          return { ...course, status: 'archived' }
        if (f.level.workshops[1]!.courseIds.includes(course.id))
          return { ...course, audience: 'kids' }
        return course
      }),
    )
    const state = (await f.service.get(owner)).areas[0]!.levels[0]!
    expect(state.nucleusCourses[0]!.state).toBe('unavailable')
    expect(state.nucleusCourses[0]!.title).toBe('Núcleo em preparação')
    expect(state.workshops[0]!.courses[0]!.state).toBe('unavailable')
    expect(state.workshops[1]!.courses[0]!.state).toBe('unavailable')
    expect(state.workshops[2]!.courses[0]!.state).toBe('available')
  })
  test('the context looks up courses from the immutable definition after current curriculum replaces them', async () => {
    const f = setup()
    await f.service.submit(owner, 'python2d', 1, { evidenceId })
    const changed = {
      ...f.curriculum,
      masteries: f.curriculum.masteries.map((area, index) =>
        index === 0
          ? {
              ...area,
              levels: area.levels.map((level, levelIndex) =>
                levelIndex === 0 ? { ...level, nucleusCourseIds: [creatorCourseId(91000)] } : level,
              ),
            }
          : area,
      ),
    }
    f.replace(changed)
    f.replaceCatalog([
      ...creatorCatalogFixture(changed, 'adult'),
      {
        id: f.level.nucleusCourseIds[0]!,
        title: 'Núcleo histórico',
        audience: 'adult',
        modality: 'recorded',
        status: 'draft',
      },
    ])
    const state = (await f.service.get(owner)).areas[0]!.levels[0]!
    expect(f.requestedHistoricalIds()).toContain(f.level.nucleusCourseIds[0]!)
    expect(f.requestedHistoricalIds()).toContain(f.level.workshops[0]!.courseIds[0]!)
    expect(state.nucleusCourses[0]!.courseId).toBe(f.level.nucleusCourseIds[0]!)
    expect(state.nucleusCourses[0]!.state).toBe('unavailable')
    expect(state.nucleusCourses[0]!.title).toBe('Núcleo histórico')
    f.complete(...f.level.nucleusCourseIds)
    expect((await f.service.get(owner)).areas[0]!.levels[0]!.nucleusCourses[0]!.state).toBe(
      'completed',
    )
  })
  test('requested changes need feedback; resubmission makes the previous pending version stale', async () => {
    const f = setup()
    const first = await f.service.submit(owner, 'python2d', 1, { evidenceId })
    await expect(
      f.service.review(first.id, reviewerId, {
        ...f.review,
        criteria: f.review.criteria.map((c) => ({ ...c, result: 'revise' })),
      }),
    ).rejects.toThrow('Explique')
    f.repository.evidence.id = '20000000-0000-4000-8000-000000000004'
    await f.service.submit(owner, 'python2d', 1, { evidenceId: f.repository.evidence.id })
    await expect(f.service.review(first.id, reviewerId, f.review)).rejects.toThrow('substituída')
  })
})
