import { expect, test } from 'bun:test'
import {
  AdultJourneyPolicySchema,
  analyzeKidsJourneyReadiness,
  compareKidsJourney,
  initialKidsJourneyPolicy,
  KidsJourneyPolicySchema,
  type KidsJourneyProjectionInput,
  kidsJourneyOpenCourseIds,
  projectAdultJourney,
  projectKidsJourney,
  resolveKidsJourneyCourseLock,
} from '../src/journey'
import {
  creatorCatalogFixture,
  creatorCurriculumFixture,
  creatorPostCompletions,
} from './fixtures/creator-curriculum'

const curriculum = creatorCurriculumFixture()
const policy = { ...initialKidsJourneyPolicy(), curriculum }
const catalog = creatorCatalogFixture(curriculum).map((course) => ({
  ...course,
  graduationOnly: false,
  tier: null,
  slot: null,
  journeyRole: 'extra' as const,
  hasShowcaseBlock: false,
}))
const input = (completedCourseIds: string[] = []): KidsJourneyProjectionInput => ({
  policy,
  policyVersion: 8,
  catalog,
  earned: {
    level: 'noob',
    capabilities: [],
    courseAccess: { entry: [], expanded: [], reward: [] },
  },
  milestones: completedCourseIds.map((courseId) => ({
    courseId,
    completed: true,
    showcased: false,
    qualifiedTier: null,
    qualifiedSlot: null,
  })),
})

test('both policy envelopes validate one optional curriculum and project the same new rules', () => {
  expect(KidsJourneyPolicySchema.safeParse(policy).success).toBe(true)
  const adult = { schemaVersion: 1 as const, stages: [], curriculum }
  expect(AdultJourneyPolicySchema.safeParse(adult).success).toBe(true)
  const facts = input(creatorPostCompletions(curriculum, 0))
  const kidsView = projectKidsJourney(facts)
  const adultView = projectAdultJourney(adult, 8, facts.milestones)
  expect(kidsView.earned.level).toBe('coder')
  expect(adultView.curriculum!.level).toBe(kidsView.earned.level)
  expect(adultView.stages[0]!.completed).toBe(true)
  expect(kidsView.advances[0]!.earned).toBe(true)
  expect(kidsView.curriculum!.stages[0]!.powersCompleted).toBe(1)
  expect(kidsView.earned.capabilities).toEqual(adultView.capabilities)
})

test('new curriculum gates extras despite their historical extra role and absent tier', () => {
  const extra = catalog.find((course) => course.id === curriculum.stages[0]!.extras[0]!.courseId)!
  expect(resolveKidsJourneyCourseLock({ ...input(), catalog, course: extra }).locked).toBe(true)
  const completed = [curriculum.stages[0]!.base2dCourseId, curriculum.stages[0]!.base3dCourseId]
  expect(resolveKidsJourneyCourseLock({ ...input(completed), catalog, course: extra }).locked).toBe(
    false,
  )
})

test('draft plans may be configured, while missing IDs or a foreign audience fail readiness', () => {
  const draft = catalog.map((course) =>
    course.id === curriculum.stages[0]!.base3dCourseId
      ? { ...course, status: 'draft' as const }
      : course,
  )
  const pending = analyzeKidsJourneyReadiness({ policy, catalog: draft })
  expect(pending.status).toBe('incomplete')
  expect(pending.horizon).toBe('noob')
  expect(pending.issues.every((issue) => issue.severity === 'warning')).toBe(true)
  expect(
    analyzeKidsJourneyReadiness({ policy, catalog: catalog.slice(1) }).issues.some(
      (issue) => issue.severity === 'error',
    ),
  ).toBe(true)
  expect(
    analyzeKidsJourneyReadiness({
      policy,
      catalog: catalog.map((course) => ({ ...course, audience: 'adult' })),
    }).issues.some((issue) => issue.code === 'course-ineligible'),
  ).toBe(true)
  expect(analyzeKidsJourneyReadiness({ policy, catalog: null }).status).toBe('unavailable')
})

test('adult positional floor and Kids rank survive migration without granting unmet tools', () => {
  const adultView = projectAdultJourney(
    { schemaVersion: 1, stages: [], curriculum },
    2,
    [],
    ['molda'],
    4,
  )
  expect(adultView.curriculum!.level).toBe('explorer')
  expect(adultView.capabilities).toEqual(['molda'])
  const previous = input()
  const kidsView = projectKidsJourney({
    ...previous,
    earned: { ...previous.earned, level: 'explorer', capabilities: ['molda'] },
  })
  expect(kidsView.earned.level).toBe('explorer')
  expect(kidsView.earned.capabilities).toEqual(['molda'])
})

test('preview reports a curriculum-only edit while preserving earned baseline', () => {
  const changed = {
    ...policy,
    curriculum: {
      ...curriculum,
      stages: curriculum.stages.map((stage, index) =>
        index ? stage : { ...stage, title: 'Faísca revisada' },
      ),
    },
  }
  const impact = compareKidsJourney({
    ...input(creatorPostCompletions(curriculum, 0)),
    proposedPolicy: changed,
  })
  expect(impact.curriculumChanged).toBe(true)
  expect(impact.after.earned.level).toBe('coder')
  expect(impact.after.earned.capabilities).toEqual(impact.before.earned.capabilities)
})

test('frozen old course access still opens the original slot after migration', () => {
  const previous = input()
  const first = { ...catalog[0]!, tier: 'primeiros-passos-2d' as const, slot: 1 }
  const legacy = {
    ...previous,
    earned: {
      ...previous.earned,
      courseAccess: { entry: ['primeiros-passos-2d' as const], expanded: [], reward: [] },
    },
  }
  const nextCatalog = [first, ...catalog.slice(1)]
  expect(
    resolveKidsJourneyCourseLock({ ...legacy, catalog: nextCatalog, course: first }).locked,
  ).toBe(false)
})

test('a former open extra keeps its pedagogical access across migration while new learners need the pair', () => {
  const cadeId = curriculum.stages[0]!.extras[0]!.courseId
  const source = {
    ...input(),
    policy: initialKidsJourneyPolicy(),
    catalog: catalog.map((course) => ({
      ...course,
      status: course.id === cadeId ? ('published' as const) : ('draft' as const),
    })),
  }
  expect(kidsJourneyOpenCourseIds(source)).toEqual([cadeId])
  const preview = compareKidsJourney({ ...source, proposedPolicy: policy })
  expect(preview.after.earned.level).toBe('noob')
  expect(preview.preservedCourseAccess.creatorCourseIds).toContain(cadeId)
  const oldLearner = { ...input(), earned: preview.after.earned }
  const extra = catalog.find((course) => course.id === cadeId)!
  expect(resolveKidsJourneyCourseLock({ ...oldLearner, catalog, course: extra }).locked).toBe(false)
  expect(resolveKidsJourneyCourseLock({ ...input(), catalog, course: extra }).locked).toBe(true)
})
