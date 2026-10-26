import { describe, expect, test } from 'bun:test'
import {
  CreatorJourneyCurriculumSchema,
  type CreatorMasteryApproval,
  courseJourneyState,
  creatorJourneyCoursePlacements,
  creatorJourneyOpenCourseIds,
  evaluateCreatorMasteries,
  projectCreatorJourney,
  resolveCreatorJourneyCourseLock,
} from '../src/journey'
import {
  creatorCatalogFixture,
  creatorCurriculumFixture,
  creatorPostCompletions,
} from './fixtures/creator-curriculum'

describe('Creator curriculum progression', () => {
  const curriculum = creatorCurriculumFixture()
  const first = curriculum.stages[0]!
  const second = curriculum.stages[1]!
  const view = (completedCourseIds: string[] = []) =>
    projectCreatorJourney({ curriculum, completedCourseIds })
  const lock = (courseId: string, completedCourseIds: string[] = []) =>
    resolveCreatorJourneyCourseLock({ curriculum, view: view(completedCourseIds), courseId })

  test('2D opens first; completion grants tools immediately and opens only 3D', () => {
    expect(lock(first.base2dCourseId).locked).toBe(false)
    expect(lock(first.base3dCourseId).locked).toBe(true)
    const completed = [first.base2dCourseId]
    expect(lock(first.base3dCourseId, completed).locked).toBe(false)
    expect(view(completed).capabilities).toEqual(['studio', 'pinta'])
    expect(view(completed).level).toBe('noob')
    expect(lock(first.missionCourseId, completed).locked).toBe(true)
    expect(lock(first.powers[0]!.courseIds[0]!, completed).locked).toBe(true)
    expect(lock(first.extras[0]!.courseId, completed).locked).toBe(true)
  })

  test('the pair opens all choices without promoting or requiring showcase', () => {
    const completed = [first.base2dCourseId, first.base3dCourseId]
    for (const courseId of [
      first.missionCourseId,
      ...first.powers.flatMap((p) => p.courseIds),
      first.extras[0]!.courseId,
    ])
      expect(lock(courseId, completed).locked).toBe(false)
    expect(view(completed).level).toBe('noob')
    expect(lock(second.base2dCourseId, completed).locked).toBe(true)
    expect(view(creatorPostCompletions(curriculum, 0)).level).toBe('coder')
  })

  test('two variants of one Power count once; extras never replace the mission or quota', () => {
    const completed = [
      ...creatorPostCompletions(curriculum, 0),
      second.base2dCourseId,
      second.base3dCourseId,
      second.missionCourseId,
      ...second.powers[0]!.courseIds,
      second.extras[0]!.courseId,
    ]
    expect(view(completed).stages[1]!.powersCompleted).toBe(1)
    expect(view(completed).level).toBe('coder')
    expect(view([...completed, second.powers[1]!.courseIds[0]!]).level).toBe('hacker')
    expect(
      view(
        [...completed, second.powers[1]!.courseIds[0]!].filter(
          (id) => id !== second.missionCourseId,
        ),
      ).level,
    ).toBe('coder')
  })

  test('future evidence cannot skip the chain; completed old posts stay earned without new grants', () => {
    expect(view(creatorPostCompletions(curriculum, 1)).level).toBe('noob')
    const preserved = projectCreatorJourney({
      curriculum,
      completedCourseIds: [],
      earnedLevel: 'explorer',
      earnedCapabilities: ['molda'],
    })
    expect(preserved.level).toBe('explorer')
    expect(preserved.stages.slice(0, 3).every((stage) => stage.completed)).toBe(true)
    expect(preserved.capabilities).toEqual(['molda'])
    expect(
      resolveCreatorJourneyCourseLock({
        curriculum,
        view: preserved,
        courseId: first.missionCourseId,
      }).locked,
    ).toBe(false)
  })

  test('paused policy keeps floors and earned rights without fresh promotion or grants', () => {
    const paused = projectCreatorJourney({
      curriculum,
      completedCourseIds: creatorPostCompletions(curriculum, 0),
      paused: true,
    })
    expect(paused.level).toBe('noob')
    expect(paused.paused).toBe(true)
    expect(view().paused).toBe(false)
    expect(paused.capabilities).toEqual([])
    expect(paused.stages[0]!.base2d.state).toBe('completed')
    expect(paused.stages[0]!.extras[0]!.state).toBe('available')
    expect(paused.stages[1]!.base2d.state).toBe('locked')
    const earned = projectCreatorJourney({
      curriculum,
      completedCourseIds: [],
      earnedLevel: 'coder',
      earnedCapabilities: ['studio'],
      paused: true,
    })
    expect(earned.level).toBe('coder')
    expect(earned.capabilities).toEqual(['studio'])
    expect(
      resolveCreatorJourneyCourseLock({
        curriculum,
        view: earned,
        courseId: first.extras[0]!.courseId,
      }).locked,
    ).toBe(false)
  })

  test('pause permits the current base, its 3D continuation and pair expansion at the frozen rank', () => {
    const initial = projectCreatorJourney({ curriculum, completedCourseIds: [], paused: true })
    expect(initial.stages[0]!.base2d.state).toBe('available')
    expect(initial.stages[0]!.base3d.state).toBe('locked')
    const next = projectCreatorJourney({
      curriculum,
      completedCourseIds: [first.base2dCourseId],
      paused: true,
    })
    expect(next.stages[0]!.base3d.state).toBe('available')
    const expanded = projectCreatorJourney({
      curriculum,
      completedCourseIds: [first.base2dCourseId, first.base3dCourseId],
      paused: true,
    })
    expect(expanded.stages[0]!.mission.state).toBe('available')
    expect(expanded.stages[0]!.powers.every((power) => power.available)).toBe(true)
    expect(expanded.level).toBe('noob')
    expect(expanded.capabilities).toEqual([])
  })

  test('draft entries remain unavailable instead of manufacturing completed content', () => {
    const catalog = creatorCatalogFixture(curriculum).map((course) =>
      course.id === first.base3dCourseId ? { ...course, status: 'draft' as const } : course,
    )
    const projected = projectCreatorJourney({
      curriculum,
      completedCourseIds: [first.base2dCourseId],
      catalog,
    })
    expect(projected.stages[0]!.base3d.state).toBe('unavailable')
    expect(projected.level).toBe('noob')
  })

  test('UUID access survives a later replacement of the pair without giving the next rank', () => {
    const before = view([first.base2dCourseId, first.base3dCourseId])
    const retainedCourseIds = creatorJourneyOpenCourseIds(curriculum, before)
    const changed = {
      ...curriculum,
      stages: curriculum.stages.map((stage, index) =>
        index
          ? stage
          : { ...stage, base3dCourseId: curriculum.masteries[0]!.levels[0]!.nucleusCourseIds[0]! },
      ),
    }
    const after = projectCreatorJourney({
      curriculum: changed,
      completedCourseIds: [first.base2dCourseId, first.base3dCourseId],
      retainedCourseIds,
    })
    expect(after.level).toBe('noob')
    expect(after.stages[0]!.pairCompleted).toBe(false)
    expect(after.stages[0]!.mission.state).toBe('available')
    expect(
      resolveCreatorJourneyCourseLock({
        curriculum: changed,
        view: after,
        courseId: first.extras[0]!.courseId,
      }).locked,
    ).toBe(false)
    expect(
      resolveCreatorJourneyCourseLock({
        curriculum: changed,
        view: after,
        courseId: second.base2dCourseId,
      }).locked,
    ).toBe(true)
  })

  test('a tool taught by an extra waits for that course, not for pair completion', () => {
    const configured = {
      ...curriculum,
      stages: curriculum.stages.map((stage, index) =>
        index
          ? stage
          : {
              ...stage,
              grants: [
                ...stage.grants,
                {
                  after: 'course' as const,
                  courseId: stage.extras[0]!.courseId,
                  capabilities: ['molda' as const],
                },
              ],
            },
      ),
    }
    const completed = [first.base2dCourseId, first.base3dCourseId]
    expect(
      projectCreatorJourney({ curriculum: configured, completedCourseIds: completed }).capabilities,
    ).not.toContain('molda')
    expect(
      projectCreatorJourney({
        curriculum: configured,
        completedCourseIds: [...completed, first.extras[0]!.courseId],
      }).capabilities,
    ).toContain('molda')
  })

  test('new curriculum completion sends a positioned legacy course to review without public posting', () => {
    expect(
      courseJourneyState({
        curriculum: { role: 'base2d', level: 'noob' },
        careerSlot: 1,
        milestones: { completed: true, showcased: false },
        progress: { completedLessons: 4, totalLessons: 5 },
        continueLessonId: 'new-lesson',
      }),
    ).toBe('review')
  })

  test('schema rejects reuse of the base as a mission or a second Power', () => {
    expect(CreatorJourneyCurriculumSchema.safeParse(curriculum).success).toBe(true)
    const reusedMission = {
      ...curriculum,
      stages: curriculum.stages.map((stage, i) =>
        i ? stage : { ...stage, missionCourseId: stage.base2dCourseId },
      ),
    }
    expect(CreatorJourneyCurriculumSchema.safeParse(reusedMission).success).toBe(false)
    const reusedPower = {
      ...curriculum,
      stages: curriculum.stages.map((stage, i) =>
        i
          ? stage
          : {
              ...stage,
              powers: stage.powers.map((power, j) =>
                j === 1 ? { ...power, courseIds: stage.powers[0]!.courseIds } : power,
              ),
            },
      ),
    }
    expect(CreatorJourneyCurriculumSchema.safeParse(reusedPower).success).toBe(false)
  })
})

describe('Mastery evidence', () => {
  const curriculum = creatorCurriculumFixture()
  const mastery = curriculum.masteries[0]!
  const level = mastery.levels[0]!
  const courses = [
    ...level.nucleusCourseIds,
    level.workshops[0]!.courseIds[0]!,
    level.workshops[1]!.courseIds[0]!,
  ]
  const approval: CreatorMasteryApproval = {
    masteryId: mastery.id,
    level: 1,
    rubricVersion: 1,
    submissionId: 'submission-1',
    decision: 'approved',
    approvedCriteriaIds: ['working', 'explained'],
  }
  const evaluate = (
    completedCourseIds: string[],
    approvals: readonly CreatorMasteryApproval[] = [],
  ) =>
    evaluateCreatorMasteries({
      curriculum,
      completedCourseIds,
      pairCompletedLevels: ['coder'],
      masteryApprovals: approvals,
    })[0]!

  test('nucleus plus two workshops still needs every criterion in one approved submission', () => {
    expect(evaluate(courses).levels[0]!.completed).toBe(false)
    expect(
      evaluate(courses, [
        { ...approval, approvedCriteriaIds: ['working'] },
        { ...approval, submissionId: 'submission-2', approvedCriteriaIds: ['explained'] },
      ]).levels[0]!.completed,
    ).toBe(false)
    expect(evaluate(courses, [approval]).levels[0]!.completed).toBe(true)
    expect(evaluate(courses, [approval]).levels[1]!.available).toBe(true)
    expect(evaluate(courses, [approval]).levels[2]!.available).toBe(false)
  })

  test('explicit reviewed equivalence credits the nucleus and named distinct workshops', () => {
    expect(
      evaluate(
        [],
        [{ ...approval, nucleusEquivalent: true, workshopCredits: ['workshop-1', 'workshop-1'] }],
      ).levels[0]!.completed,
    ).toBe(false)
    expect(
      evaluate(
        [],
        [{ ...approval, nucleusEquivalent: true, workshopCredits: ['workshop-1', 'workshop-2'] }],
      ).levels[0]!.completed,
    ).toBe(true)
  })

  test('the awarded submission is exactly the one that proves both criteria and credited requirements', () => {
    const complete = {
      ...approval,
      submissionId: 'proof-complete',
      nucleusEquivalent: true,
      workshopCredits: ['workshop-1', 'workshop-2'],
    }
    const laterIncomplete = {
      ...approval,
      submissionId: 'other-proof',
      nucleusEquivalent: false,
      workshopCredits: [],
    }
    const earned = evaluate([], [complete, laterIncomplete]).levels[0]!
    expect(earned.completed).toBe(true)
    expect(earned.approvedSubmissionId).toBe('proof-complete')
    const splitCredits = evaluate(
      [],
      [
        { ...approval, nucleusEquivalent: true, workshopCredits: ['workshop-1'] },
        {
          ...approval,
          submissionId: 'split-proof',
          nucleusEquivalent: true,
          workshopCredits: ['workshop-2'],
        },
      ],
    ).levels[0]!
    expect(splitCredits.completed).toBe(false)
  })

  test('a sibling area is independent and an old award survives a later rubric and pause', () => {
    const awarded = evaluateCreatorMasteries({
      curriculum,
      completedCourseIds: [],
      pairCompletedLevels: [],
      paused: true,
      masteryAwards: [{ masteryId: mastery.id, level: 1 }],
    })
    expect(awarded[0]!.levels[0]!.completed).toBe(true)
    expect(awarded[0]!.levels[1]!.available).toBe(true)
    expect(awarded[1]!.levels[0]!.completed).toBe(false)
    expect(evaluate(courses, [{ ...approval, rubricVersion: 2 }]).levels[0]!.completed).toBe(false)
  })

  test('no mastery promotion while paused and future pair facts cannot skip the main chain', () => {
    const paused = evaluateCreatorMasteries({
      curriculum,
      completedCourseIds: courses,
      pairCompletedLevels: ['coder'],
      masteryApprovals: [approval],
      paused: true,
    })
    expect(paused[0]!.levels[0]!.completed).toBe(false)
    const future = projectCreatorJourney({
      curriculum,
      completedCourseIds: [
        curriculum.stages[1]!.base2dCourseId,
        curriculum.stages[1]!.base3dCourseId,
      ],
    })
    expect(future.masteries[0]!.available).toBe(false)
  })

  test('a previous submission preserves its level admission without earning it or admitting another area', () => {
    const admitted = evaluateCreatorMasteries({
      curriculum,
      completedCourseIds: [],
      pairCompletedLevels: [],
      masteryAdmissions: [{ masteryId: mastery.id, level: 1 }],
    })
    expect(admitted[0]!.available).toBe(true)
    expect(admitted[0]!.levels[0]!.available).toBe(true)
    expect(admitted[0]!.levels[0]!.completed).toBe(false)
    expect(admitted[0]!.levels[0]!.earned).toBe(false)
    expect(admitted[0]!.levels[1]!.available).toBe(false)
    expect(admitted[1]!.available).toBe(false)
    const paused = evaluateCreatorMasteries({
      curriculum,
      completedCourseIds: courses,
      pairCompletedLevels: [],
      masteryAdmissions: [{ masteryId: mastery.id, level: 1 }],
      masteryApprovals: [approval],
      paused: true,
    })
    expect(paused[0]!.levels[0]!.available).toBe(true)
    expect(paused[0]!.levels[0]!.completed).toBe(false)
    expect(paused[0]!.levels[1]!.available).toBe(false)
    const secondLevelReceipt = evaluateCreatorMasteries({
      curriculum,
      completedCourseIds: [],
      pairCompletedLevels: [],
      masteryAdmissions: [{ masteryId: mastery.id, level: 2 }],
    })[0]!
    expect(secondLevelReceipt.levels[0]!.available).toBe(false)
    expect(secondLevelReceipt.levels[1]!.available).toBe(true)
    expect(secondLevelReceipt.levels[1]!.earned).toBe(false)
    expect(secondLevelReceipt.levels[2]!.available).toBe(false)
  })

  test('retained course access alone does not admit a mastery or manufacture completion', () => {
    const retained = evaluateCreatorMasteries({
      curriculum,
      completedCourseIds: [],
      pairCompletedLevels: [],
      retainedCourseIds: level.nucleusCourseIds,
    })[0]!
    expect(retained.available).toBe(false)
    expect(retained.levels[0]!.nucleusCourses[0]!.state).toBe('available')
    expect(retained.levels[0]!.nucleusCompleted).toBe(false)
  })

  test('course credit can appear in a post and a mastery without replacing either authority', () => {
    const shared = {
      ...curriculum,
      masteries: curriculum.masteries.map((m, i) =>
        i
          ? m
          : {
              ...m,
              levels: m.levels.map((l, j) =>
                j ? l : { ...l, nucleusCourseIds: [curriculum.stages[0]!.base2dCourseId] },
              ),
            },
      ),
    }
    expect(
      creatorJourneyCoursePlacements(shared, curriculum.stages[0]!.base2dCourseId).map(
        (p) => p.role,
      ),
    ).toEqual(['base2d', 'mastery-nucleus'])
  })

  test('mastery nucleus grants a tool band before the final delivery and needs actual dependencies', () => {
    const configured = {
      ...curriculum,
      masteries: curriculum.masteries.map((m, i) =>
        i
          ? m
          : {
              ...m,
              levels: m.levels.map((l, j) =>
                j ? l : { ...l, grants: ['molda-intermediate' as const] },
              ),
            },
      ),
    }
    const completedCourseIds = [
      ...creatorPostCompletions(curriculum, 0),
      curriculum.stages[1]!.base2dCourseId,
      curriculum.stages[1]!.base3dCourseId,
      ...level.nucleusCourseIds,
    ]
    expect(
      projectCreatorJourney({ curriculum: configured, completedCourseIds }).capabilities,
    ).not.toContain('molda-intermediate')
    const projected = projectCreatorJourney({
      curriculum: configured,
      completedCourseIds,
      earnedCapabilities: ['molda'],
    })
    expect(projected.capabilities).toContain('molda-intermediate')
    expect(projected.masteries[0]!.levels[0]!.completed).toBe(false)
  })

  test('a credited award preserves its recorded tools without inventing grants added by a later policy', () => {
    const configured = {
      ...curriculum,
      masteries: curriculum.masteries.map((m, i) =>
        i
          ? m
          : {
              ...m,
              levels: m.levels.map((l, j) =>
                j ? l : { ...l, grants: ['molda-intermediate' as const] },
              ),
            },
      ),
    }
    const projected = projectCreatorJourney({
      curriculum: configured,
      completedCourseIds: [],
      paused: true,
      masteryAwards: [{ masteryId: mastery.id, level: 1, capabilities: ['molda'] }],
    })
    expect(projected.capabilities).toContain('molda')
    expect(projected.capabilities).not.toContain('molda-intermediate')
    expect(projected.masteries[0]!.levels[0]!.completed).toBe(true)
    expect(
      projected.masteries[0]!.levels[0]!.nucleusCourses.every(
        (course) => course.state !== 'completed',
      ),
    ).toBe(true)
  })
})
