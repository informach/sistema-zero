import { expect, test } from 'bun:test'
import {
  KidsJourneyCourseAccessSchema,
  type KidsJourneyPolicy,
  KidsJourneyPolicySchema,
  pauseKidsJourneyPolicy,
} from '../src/journey/kids-policy'
import {
  compareKidsJourney,
  projectKidsJourney,
  resolveKidsJourneyCourseLock,
  resolveKidsJourneyCourseLocks,
} from '../src/journey/kids-projection'
import { initialKidsJourneyPolicy } from '../src/journey/kids-seed'
import { analyzeKidsJourneyReadiness } from '../src/journey/kids-validation'
import { kidsJourneyFacts, kidsJourneyInput, kidsMilestones } from './fixtures/kids-journey'

function replaceTier(patch: Partial<KidsJourneyPolicy['tierAccess'][number]>): KidsJourneyPolicy {
  const seed = initialKidsJourneyPolicy()
  return {
    ...seed,
    tierAccess: seed.tierAccess.map((rule) =>
      rule.tier === 'iniciante-2d' ? { ...rule, ...patch } : rule,
    ),
  }
}

test('canonical contract requires complete explicit access rules and rejects prototype modes', () => {
  const seed = initialKidsJourneyPolicy()
  expect(KidsJourneyPolicySchema.safeParse({ schemaVersion: 1, mode: 'legacy' }).success).toBe(
    false,
  )
  expect(KidsJourneyPolicySchema.safeParse({ ...seed, mode: 'configured' }).success).toBe(false)
  expect(KidsJourneyPolicySchema.safeParse({ ...seed, tierAccess: [] }).success).toBe(false)
  expect(
    KidsJourneyPolicySchema.safeParse({
      ...seed,
      tierAccess: seed.tierAccess.map(() => seed.tierAccess[0]),
    }).success,
  ).toBe(false)
  expect(
    KidsJourneyPolicySchema.safeParse(replaceTier({ opensAt: 'god', completedAt: 'coder' }))
      .success,
  ).toBe(false)
  expect(
    KidsJourneyCourseAccessSchema.safeParse({ entry: [], expanded: ['iniciante-2d'], reward: [] })
      .success,
  ).toBe(false)
  expect(
    KidsJourneyCourseAccessSchema.safeParse({ entry: [], expanded: [], reward: ['iniciante-2d'] })
      .success,
  ).toBe(true)
  expect(
    KidsJourneyCourseAccessSchema.safeParse({
      entry: ['iniciante-2d', 'iniciante-2d'],
      expanded: [],
      reward: [],
    }).success,
  ).toBe(false)
})

test('known missing foundation preserves future reward quirk without granting entry', () => {
  const catalog = kidsJourneyFacts().filter(
    (course) => course.tier !== 'avancado-3d' || course.slot !== 1,
  )
  const input = kidsJourneyInput({ catalog })
  const earned = projectKidsJourney(input).earned
  expect(earned.courseAccess.reward).toContain('avancado-3d')
  expect(earned.courseAccess.entry).not.toContain('avancado-3d')
  expect(earned.courseAccess.expanded).not.toContain('avancado-3d')
  const course = catalog.find((candidate) => candidate.tier === 'avancado-3d')!
  expect(
    resolveKidsJourneyCourseLock({
      ...input,
      catalog,
      course: { ...course, slot: null, journeyRole: 'reward' },
    }).locked,
  ).toBe(false)
  expect(resolveKidsJourneyCourseLock({ ...input, catalog, course }).reason).toBe('future-tier')
  expect(
    projectKidsJourney(kidsJourneyInput({ catalog: null })).earned.courseAccess.reward,
  ).toEqual([])
})

test('liberal policy then offline restrictive policy preserves entry expanded and reward', () => {
  const liberal = replaceTier({ opensAt: 'noob', completedAt: 'noob' })
  const beforeInput = kidsJourneyInput({ policy: liberal })
  const before = projectKidsJourney(beforeInput)
  expect(before.earned.level).toBe('noob')
  for (const rights of Object.values(before.earned.courseAccess))
    expect(rights).toContain('iniciante-2d')
  const restrictive = replaceTier({
    opensAt: 'god',
    completedAt: 'god',
    foundation: { slot: 1, milestone: 'showcase', whenMissing: 'locked' },
  })
  const input = { ...beforeInput, policy: restrictive, earned: before.earned }
  const catalog = kidsJourneyFacts()
  for (const course of [
    catalog[1]!,
    catalog[2]!,
    { ...catalog[1]!, slot: null, journeyRole: 'reward' as const },
  ]) {
    expect(resolveKidsJourneyCourseLock({ ...input, catalog, course }).locked).toBe(false)
    expect(
      resolveKidsJourneyCourseLock({ ...input, earned: beforeInput.earned, catalog, course })
        .locked,
    ).toBe(true)
  }
  expect(projectKidsJourney(input).earned.courseAccess).toEqual(before.earned.courseAccess)
  const impact = compareKidsJourney({ ...beforeInput, proposedPolicy: restrictive })
  expect(impact.changes).toEqual([])
  expect(impact.tierAccessChanges).toHaveLength(1)
  expect(impact.preservedCourseAccess).toEqual(before.earned.courseAccess)
})

test('complete foundation access survives later showcase requirement without a new visit', () => {
  const policy = replaceTier({
    foundation: { slot: 1, milestone: 'complete', whenMissing: 'open' },
  })
  const milestones = [...kidsMilestones(1), { ...kidsMilestones(2)[1]!, showcased: false }]
  const input = kidsJourneyInput({ policy, milestones })
  const earned = projectKidsJourney(input).earned
  expect(earned.courseAccess.expanded).toContain('iniciante-2d')
  const restrictive = initialKidsJourneyPolicy()
  const catalog = kidsJourneyFacts()
  expect(
    resolveKidsJourneyCourseLock({
      ...input,
      policy: restrictive,
      earned,
      catalog,
      course: catalog[2]!,
    }).locked,
  ).toBe(false)
  expect(
    resolveKidsJourneyCourseLock({ ...input, policy: restrictive, catalog, course: catalog[2]! })
      .reason,
  ).toBe('foundation-first')
})

test('preserved entry plus a real base completion freezes expanded before a later restriction', () => {
  const policy = replaceTier({
    foundation: { slot: 1, milestone: 'complete', whenMissing: 'locked' },
  })
  const input = kidsJourneyInput({
    policy,
    milestones: [{ ...kidsMilestones(2)[1]!, showcased: false }],
    earned: {
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: ['iniciante-2d'], expanded: [], reward: [] },
    },
  })
  const catalog = kidsJourneyFacts()
  expect(resolveKidsJourneyCourseLock({ ...input, catalog, course: catalog[2]! }).locked).toBe(
    false,
  )
  const before = projectKidsJourney(input)
  expect(before.earned.courseAccess.expanded).toContain('iniciante-2d')
  const restrictive = replaceTier({
    foundation: { slot: 1, milestone: 'showcase', whenMissing: 'locked' },
  })
  expect(
    resolveKidsJourneyCourseLock({
      ...input,
      policy: restrictive,
      earned: before.earned,
      catalog,
      course: catalog[2]!,
    }).locked,
  ).toBe(false)
})

test('preserved entry with known missing-open foundation also freezes expanded', () => {
  const policy = initialKidsJourneyPolicy()
  const catalog = kidsJourneyFacts().filter(
    (course) => course.tier !== 'iniciante-2d' || course.slot !== 1,
  )
  const input = kidsJourneyInput({
    policy,
    catalog,
    earned: {
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: ['iniciante-2d'], expanded: [], reward: [] },
    },
  })
  expect(
    resolveKidsJourneyCourseLock({
      ...input,
      catalog,
      course: catalog.find((course) => course.tier === 'iniciante-2d')!,
    }).locked,
  ).toBe(false)
  expect(projectKidsJourney(input).earned.courseAccess.expanded).toContain('iniciante-2d')
})

test('paused real foundation completion expands lessons without advancing rank or app capabilities', () => {
  const policy = replaceTier({
    foundation: { slot: 1, milestone: 'complete', whenMissing: 'locked' },
  })
  const earned = projectKidsJourney(
    kidsJourneyInput({ policy, milestones: kidsMilestones(1) }),
  ).earned
  expect(earned.courseAccess.expanded).not.toContain('iniciante-2d')
  const input = kidsJourneyInput({
    policy: pauseKidsJourneyPolicy(policy),
    earned,
    milestones: kidsMilestones(),
  })
  const after = projectKidsJourney(input).earned
  expect(after.level).toBe(earned.level)
  expect(after.capabilities).toEqual(earned.capabilities)
  expect(after.courseAccess.expanded).toContain('iniciante-2d')
  expect(after.courseAccess.entry).not.toContain('iniciante-3d')
  expect(after.courseAccess.reward).not.toContain('iniciante-2d')
})

test('policy access gates participate in readiness instead of consulting old rank mappings', () => {
  const policy = replaceTier({ opensAt: 'god', completedAt: 'god' })
  expect(
    analyzeKidsJourneyReadiness({ policy, catalog: kidsJourneyFacts() }).issues,
  ).toContainEqual(
    expect.objectContaining({ level: 'hacker', code: 'course-locked', severity: 'error' }),
  )
  const missing = replaceTier({
    foundation: { slot: 1, milestone: 'complete', whenMissing: 'locked' },
  })
  const catalog = kidsJourneyFacts().filter(
    (course) => course.tier !== 'iniciante-2d' || course.slot !== 1,
  )
  expect(analyzeKidsJourneyReadiness({ policy: missing, catalog }).issues).toContainEqual(
    expect.objectContaining({ level: 'hacker', code: 'foundation-unreachable' }),
  )
})

test('one batch keeps inherited entry, foundation requirements, independent reward and outside courses distinct', () => {
  const catalog = kidsJourneyFacts()
  const reward = {
    ...catalog[48]!,
    id: '00000000-0000-4000-8000-000000001000',
    slot: null,
    journeyRole: 'reward' as const,
  }
  const outside = {
    ...catalog[2]!,
    id: '00000000-0000-4000-8000-000000001001',
    tier: null,
    journeyRole: 'extra' as const,
  }
  const input = kidsJourneyInput({
    earned: {
      level: 'coder',
      capabilities: [],
      courseAccess: { entry: ['iniciante-2d'], expanded: [], reward: ['avancado-3d'] },
    },
    catalog: [...catalog, reward, outside],
  })
  const before = resolveKidsJourneyCourseLocks({
    ...input,
    catalog: input.catalog!,
    courses: [catalog[1]!, catalog[2]!, reward, outside],
  })
  expect(before.get(catalog[1]!.id)).toEqual({ locked: false })
  expect(before.get(catalog[2]!.id)).toMatchObject({ locked: true, reason: 'foundation-first' })
  expect(before.get(reward.id)).toEqual({ locked: false })
  expect(before.get(outside.id)).toEqual({ locked: false })
  const completeOnly = replaceTier({
    foundation: { slot: 1, milestone: 'complete', whenMissing: 'locked' },
  })
  const after = resolveKidsJourneyCourseLocks({
    ...input,
    catalog: input.catalog!,
    policy: completeOnly,
    milestones: [{ ...kidsMilestones(2)[1]!, showcased: false }],
    courses: [catalog[2]!, reward],
  })
  expect(after.get(catalog[2]!.id)).toEqual({ locked: false })
  expect(after.get(reward.id)).toEqual({ locked: false })
})

test('paused batches use the frozen rank even when new course facts could promote the child', () => {
  const catalog = kidsJourneyFacts()
  const input = kidsJourneyInput({
    policy: pauseKidsJourneyPolicy(initialKidsJourneyPolicy()),
    milestones: kidsMilestones(49),
    earned: {
      level: 'coder',
      capabilities: ['studio', 'pinta'],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
  const locks = resolveKidsJourneyCourseLocks({ ...input, catalog, courses: catalog })
  expect(locks.size).toBe(49)
  expect(locks.get(catalog[2]!.id)).toEqual({ locked: false })
  expect(locks.get(catalog[9]!.id)).toMatchObject({
    locked: true,
    reason: 'future-tier',
    requiredLevel: 'hacker',
  })
})
