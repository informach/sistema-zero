import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  creatorCatalogFixture,
  creatorCourseId,
  creatorCurriculumFixture,
} from '../../../core/tests/fixtures/creator-curriculum'
import { AdultJourneyService } from '../../src/application/adult-journey/adult-journey.service'
import { masteryJourneyFacts } from '../../src/application/creator-journey/mastery-journey-facts'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import { buildApp, seedSampleCourse } from '../helpers'

for (const audience of ['kids', 'adult'] as const) {
  for (const credited of [false, true]) {
    test(`${audience}: shared gates honor a historical nucleus ${credited ? 'credit' : 'completion'} before the mastery badge`, async () => {
      const ctx = buildApp()
      const userId = randomUUID()
      const accountId = audience === 'adult' ? userId : randomUUID()
      const original = creatorCurriculumFixture()
      const area = original.masteries.find((mastery) => mastery.id === 'modelagem3d')!
      const definition = { ...area.levels[1]!, grants: ['molda-intermediate' as const] }
      const replacementId = creatorCourseId(99900)
      const curriculum = {
        ...original,
        masteries: original.masteries.map((mastery) =>
          mastery.id !== area.id
            ? mastery
            : {
                ...mastery,
                opensAfterPair: 'champion' as const,
                levels: mastery.levels.map((level) =>
                  level.level !== 2 ? level : { ...definition, nucleusCourseIds: [replacementId] },
                ),
              },
        ),
      }
      const submissionId = randomUUID()
      const facts = masteryJourneyFacts({
        submissions: [
          { id: submissionId, masteryId: area.id, level: 2, definition, submittedAt: new Date(0) },
        ],
        reviews: credited
          ? [
              {
                id: randomUUID(),
                submissionId,
                reviewerId: randomUUID(),
                reviewedAt: new Date(1),
                feedback: 'Núcleo demonstrado nesta entrega.',
                criteria: definition.rubric.criteria.map((criterion) => ({
                  criterionId: criterion.id,
                  result: 'approved' as const,
                  feedback: '',
                })),
                credits: [
                  {
                    requirementId: 'nucleus',
                    reason: 'Os conceitos do núcleo estão demonstrados no projeto.',
                  },
                ],
              },
            ]
          : [],
        awards: [{ masteryId: area.id, level: 1, capabilities: ['molda'] }],
      })
      const seeded = seedSampleCourse(ctx.courses, `template-${audience}`, 'published', audience)
      const template = ctx.courses.courses.find((course) => course.id === seeded.courseId)!
      const catalog = new Map(
        [
          ...creatorCatalogFixture(original, audience),
          ...creatorCatalogFixture(curriculum, audience),
        ].map((course) => [course.id, course]),
      )
      ctx.courses.courses = [...catalog.values()].map((course) => ({
        ...template,
        ...course,
        slug: `course-${course.id}`,
        level: 'lenda',
        track: '3d',
        careerSlot: null,
        journeyRole: 'reward',
      }))
      if (!credited)
        ctx.gamification.events.push(
          ...definition.nucleusCourseIds.map((courseId) => ({
            userId,
            audience,
            sourceId: courseId,
            sourceType: 'course_complete' as const,
            amount: 0,
            createdAt: new Date(),
          })),
        )
      ctx.kidsJourneySnapshots.policy = { ...ctx.kidsJourneySnapshots.policy, curriculum }
      ctx.adultJourneyRepository.record = {
        version: 1,
        policy: { schemaVersion: 1, stages: [], curriculum },
      }
      const kids = new KidsJourneyQueryService(ctx.kidsJourneySnapshots, async () => facts)
      const adult = new AdultJourneyService(
        ctx.adultJourneyRepository,
        ctx.courses,
        () => new Date(),
        async () => facts,
      )
      const owner = { userId, accountId }
      const view =
        audience === 'kids'
          ? (await kids.get(owner)).curriculum!
          : (await adult.get(userId)).curriculum!
      const level = view.masteries.find((mastery) => mastery.id === area.id)!.levels[1]!
      expect(level.nucleusCompleted).toBe(true)
      expect(level.completed).toBe(false)
      expect(level.earned).toBe(false)
      expect(view.capabilities).toContain('molda-intermediate')
      if (audience === 'adult')
        expect((await adult.get(userId)).capabilities).toContain('molda-intermediate')
      const state =
        audience === 'kids'
          ? await kids.courseState(owner, definition.nucleusCourseIds)
          : await adult.courseState(userId, definition.nucleusCourseIds)
      expect(state.courseContexts.get(definition.nucleusCourseIds[0]!)).toMatchObject({
        role: 'mastery-nucleus',
        masteryId: area.id,
        masteryLevel: 2,
      })
      expect(state.locks.get(definition.nucleusCourseIds[0]!)?.locked).toBe(false)
      const context =
        audience === 'kids' ? await kids.masteryContext(owner) : await adult.masteryContext(userId)
      expect(
        context.view!.masteries.find((mastery) => mastery.id === area.id)!.levels[1]!
          .nucleusCourseIds,
      ).toEqual(definition.nucleusCourseIds)
      if (audience === 'kids') {
        ctx.kidsJourneySnapshots.policy = { ...ctx.kidsJourneySnapshots.policy, mode: 'paused' }
        expect((await kids.get(owner)).curriculum!.capabilities).not.toContain('molda-intermediate')
      }
    })
  }
}
