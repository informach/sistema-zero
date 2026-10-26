import { expect, test } from 'bun:test'
import {
  creatorJourneyOpenCourseIds,
  projectCreatorJourney,
  resolveCreatorJourneyCourseLock,
} from '../src/journey'
import {
  creatorCatalogFixture,
  creatorCourseId,
  creatorCurriculumFixture,
} from './fixtures/creator-curriculum'

test('historical mastery requirements grant the taught tool before the final badge after a policy edit', () => {
  const original = creatorCurriculumFixture()
  const area = original.masteries.find((m) => m.id === 'modelagem3d')!
  const definition = { ...area.levels[1]!, grants: ['molda-intermediate' as const] }
  const replacementId = creatorCourseId(99900)
  const curriculum = {
    ...original,
    masteries: original.masteries.map((m) =>
      m.id !== area.id
        ? m
        : {
            ...m,
            opensAfterPair: 'champion' as const,
            levels: m.levels.map((l) =>
              l.level !== 2 ? l : { ...definition, nucleusCourseIds: [replacementId] },
            ),
          },
    ),
  }
  const view = projectCreatorJourney({
    curriculum,
    completedCourseIds: definition.nucleusCourseIds,
    catalog: [...creatorCatalogFixture(original), ...creatorCatalogFixture(curriculum)],
    masteryAwards: [{ masteryId: area.id, level: 1, capabilities: ['molda'] }],
    masteryAdmissions: [{ masteryId: area.id, level: 2 }],
    masteryDefinitions: [{ masteryId: area.id, definition }],
  })
  const level = view.masteries.find((m) => m.id === area.id)!.levels[1]!
  expect(level.nucleusCourseIds).toEqual(definition.nucleusCourseIds)
  expect(level.nucleusCompleted).toBe(true)
  expect(level.completed).toBe(false)
  expect(view.capabilities).toContain('molda-intermediate')
  expect(creatorJourneyOpenCourseIds(curriculum, view)).toContain(definition.nucleusCourseIds[0]!)
  expect(creatorJourneyOpenCourseIds(curriculum, view)).not.toContain(replacementId)
})

test('a reviewed nucleus credit grants its tool without inventing workshop completion or a badge', () => {
  const original = creatorCurriculumFixture()
  const area = original.masteries.find((m) => m.id === 'modelagem3d')!
  const definition = { ...area.levels[1]!, grants: ['molda-intermediate' as const] }
  const view = projectCreatorJourney({
    curriculum: original,
    completedCourseIds: [],
    masteryDefinitions: [{ masteryId: area.id, definition }],
    masteryAwards: [{ masteryId: area.id, level: 1, capabilities: ['molda'] }],
    masteryApprovals: [
      {
        masteryId: area.id,
        level: 2,
        rubricVersion: definition.rubric.version,
        submissionId: 'reviewed',
        decision: 'approved',
        approvedCriteriaIds: definition.rubric.criteria.map((c) => c.id),
        nucleusEquivalent: true,
      },
    ],
  })
  const level = view.masteries.find((m) => m.id === area.id)!.levels[1]!
  expect(level.nucleusCompleted).toBe(true)
  expect(level.workshopsCompleted).toBe(0)
  expect(level.completed).toBe(false)
  expect(view.capabilities).toContain('molda-intermediate')
})

test('moving a historical nucleus into a future post does not invalidate its preserved admission', () => {
  const original = creatorCurriculumFixture()
  const area = original.masteries.find((mastery) => mastery.id === 'modelagem3d')!
  const definition = area.levels[1]!
  const oldId = definition.nucleusCourseIds[0]!
  const curriculum = {
    ...original,
    stages: original.stages.map((stage, index) =>
      index === 6 ? { ...stage, base2dCourseId: oldId } : stage,
    ),
    masteries: original.masteries.map((mastery) =>
      mastery.id !== area.id
        ? mastery
        : {
            ...mastery,
            levels: mastery.levels.map((level) =>
              level.level !== 2 ? level : { ...level, nucleusCourseIds: [creatorCourseId(99901)] },
            ),
          },
    ),
  }
  const view = projectCreatorJourney({
    curriculum,
    completedCourseIds: [],
    masteryDefinitions: [{ masteryId: area.id, definition }],
    masteryAdmissions: [{ masteryId: area.id, level: 2 }],
  })
  expect(view.stages[6]!.available).toBe(false)
  expect(resolveCreatorJourneyCourseLock({ curriculum, view, courseId: oldId }).locked).toBe(false)
  expect(creatorJourneyOpenCourseIds(curriculum, view)).toContain(oldId)
})
