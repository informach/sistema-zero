import { expect, test } from 'bun:test'
import {
  type KidsJourneyActivePolicy,
  KidsJourneyPolicySchema,
  kidsJourneySteps,
  pauseKidsJourneyPolicy,
} from '../src/journey/kids-policy'
import { projectKidsJourney, resolveKidsJourneyCourseLock } from '../src/journey/kids-projection'
import { kidsJourneyFacts, kidsJourneyInput, kidsMilestones } from './fixtures/kids-journey'

function completeOnlyPolicy(): KidsJourneyActivePolicy {
  return {
    schemaVersion: 1,
    mode: 'configured',
    steps: kidsJourneySteps({ schemaVersion: 1, mode: 'legacy' }).map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: step.requirements.map((requirement) => ({
              ...requirement,
              milestone: 'complete' as const,
            })),
          }
        : step,
    ),
  }
}

test('pause preserves the complete-only foundation and does not earn later milestones', () => {
  const policy = completeOnlyPolicy()
  const catalog = kidsJourneyFacts()
  const input = kidsJourneyInput({
    policy,
    catalog,
    milestones: [...kidsMilestones(1), { ...kidsMilestones(2)[1]!, showcased: false }],
  })
  const earned = projectKidsJourney(input).earned
  expect(earned.level).toBe('coder')
  expect(resolveKidsJourneyCourseLock({ ...input, catalog, course: catalog[2]! }).locked).toBe(
    false,
  )
  const paused = pauseKidsJourneyPolicy(policy)
  const after = { ...input, policy: paused, earned }
  expect(resolveKidsJourneyCourseLock({ ...after, catalog, course: catalog[2]! }).locked).toBe(
    false,
  )
  const withLaterMilestones = { ...after, milestones: kidsMilestones() }
  expect(projectKidsJourney(withLaterMilestones).earned).toEqual(earned)
  expect(
    resolveKidsJourneyCourseLock({ ...withLaterMilestones, catalog, course: catalog[9]! }).reason,
  ).toBe('future-tier')
  expect(
    resolveKidsJourneyCourseLock({
      ...withLaterMilestones,
      catalog,
      course: { ...catalog[1]!, slot: null, journeyRole: 'reward' },
    }).reason,
  ).toBe('tier-reward')
})

test('pause without any earned milestone does not open current peers or future courses', () => {
  const policy = completeOnlyPolicy()
  const catalog = kidsJourneyFacts()
  const paused = pauseKidsJourneyPolicy(policy)
  const input = { ...kidsJourneyInput({ policy: paused, catalog }), catalog }
  expect(projectKidsJourney(input).earned).toEqual({ level: 'noob', capabilities: [] })
  expect(resolveKidsJourneyCourseLock({ ...input, course: catalog[1]! }).reason).toBe('future-tier')
  const coder = { ...input, earned: { level: 'coder' as const, capabilities: [] } }
  expect(resolveKidsJourneyCourseLock({ ...coder, course: catalog[2]! }).reason).toBe(
    'foundation-first',
  )
  expect(projectKidsJourney(coder).earned.capabilities).toEqual([])
})

test('pause of legacy preserves every rank/base lock without using new milestones for rank', () => {
  const policy = { schemaVersion: 1, mode: 'legacy' } as const
  const catalog = kidsJourneyFacts()
  const input = kidsJourneyInput({ policy, catalog, milestones: kidsMilestones(2) })
  const earned = projectKidsJourney(input).earned
  const paused = pauseKidsJourneyPolicy(policy)
  for (const course of catalog) {
    expect(resolveKidsJourneyCourseLock({ ...input, catalog, course })).toEqual(
      resolveKidsJourneyCourseLock({ ...input, catalog, policy: paused, earned, course }),
    )
  }
  const later = { ...input, catalog, policy: paused, earned, milestones: kidsMilestones() }
  expect(projectKidsJourney(later).earned).toEqual(earned)
  expect(resolveKidsJourneyCourseLock({ ...later, course: catalog[9]! }).reason).toBe('future-tier')
})

test('pause requires one validated active policy and cannot nest or discard it', () => {
  const policy = completeOnlyPolicy()
  const paused = pauseKidsJourneyPolicy(policy)
  expect(KidsJourneyPolicySchema.safeParse(paused).success).toBe(true)
  expect(pauseKidsJourneyPolicy(paused)).toEqual(paused)
  expect(KidsJourneyPolicySchema.safeParse({ schemaVersion: 1, mode: 'paused' }).success).toBe(
    false,
  )
  expect(
    KidsJourneyPolicySchema.safeParse({ schemaVersion: 1, mode: 'paused', policy: paused }).success,
  ).toBe(false)
  expect(
    KidsJourneyPolicySchema.safeParse({
      schemaVersion: 1,
      mode: 'paused',
      policy: { ...policy, steps: [] },
    }).success,
  ).toBe(false)
})
