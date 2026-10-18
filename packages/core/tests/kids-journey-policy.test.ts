import { describe, expect, test } from 'bun:test'
import {
  type KidsJourneyPolicy,
  KidsJourneyPolicySchema,
  kidsJourneySteps,
} from '../src/journey/kids-policy'
import {
  compareKidsJourney,
  projectKidsJourney,
  resolveKidsJourneyCourseLock,
} from '../src/journey/kids-projection'
import {
  analyzeKidsJourneyReadiness,
  validateKidsJourneyPolicy,
} from '../src/journey/kids-validation'
import {
  kidsCourseId,
  kidsJourneyFacts,
  kidsJourneyInput,
  kidsMilestones,
} from './fixtures/kids-journey'

function configured(): Extract<KidsJourneyPolicy, { mode: 'configured' }> {
  return {
    schemaVersion: 1,
    mode: 'configured',
    steps: kidsJourneySteps({ schemaVersion: 1, mode: 'legacy' }),
  }
}

describe('Kids policy contracts', () => {
  test('strict schemas reject empty, unordered, duplicate and invalid requirements', () => {
    const policy = configured()
    expect(KidsJourneyPolicySchema.safeParse(policy).success).toBe(true)
    expect(validateKidsJourneyPolicy({ ...policy, audience: 'adult' }).success).toBe(false)
    expect(validateKidsJourneyPolicy({ ...policy, steps: [] }).success).toBe(false)
    expect(
      validateKidsJourneyPolicy({ ...policy, steps: [...policy.steps].reverse() }).success,
    ).toBe(false)
    const replace = (requirements: unknown[]) => ({
      ...policy,
      steps: [{ ...policy.steps[0], requirements }, ...policy.steps.slice(1)],
    })
    expect(validateKidsJourneyPolicy(replace([])).success).toBe(false)
    expect(
      validateKidsJourneyPolicy(
        replace([policy.steps[0]!.requirements[0], policy.steps[0]!.requirements[0]]),
      ).success,
    ).toBe(false)
    expect(
      validateKidsJourneyPolicy(
        replace([{ kind: 'slot', tier: 'primeiros-passos-2d', slot: 2, milestone: 'complete' }]),
      ).success,
    ).toBe(false)
    expect(
      validateKidsJourneyPolicy(
        replace([{ kind: 'course', courseId: 'invalid', milestone: 'complete' }]),
      ).success,
    ).toBe(false)
  })

  test('dependencies are cumulative, with no technical Pro-to-bridge requirement', () => {
    const policy = configured()
    const steps = policy.steps.map((step) => ({ ...step, capabilities: [] }))
    const withCaps = (capabilities: readonly string[]) => ({
      ...policy,
      steps: [{ ...steps[0], capabilities }, ...steps.slice(1)],
    })
    expect(validateKidsJourneyPolicy(withCaps(['pro'])).success).toBe(false)
    expect(validateKidsJourneyPolicy(withCaps(['studio', 'pro'])).success).toBe(true)
    expect(validateKidsJourneyPolicy(withCaps(['pensa'])).success).toBe(false)
    expect(validateKidsJourneyPolicy(withCaps(['molda-professional'])).success).toBe(false)
  })

  test('course complete permits advance, showcase requires completion too', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: [
              {
                kind: 'course' as const,
                courseId: kidsCourseId(0),
                milestone: 'complete' as const,
              },
            ],
          }
        : step,
    )
    const milestone = { ...kidsMilestones(1)[0]!, showcased: false }
    expect(
      projectKidsJourney(
        kidsJourneyInput({ policy: { ...policy, steps }, milestones: [milestone] }),
      ).earned.level,
    ).toBe('coder')
    expect(
      projectKidsJourney(
        kidsJourneyInput({ milestones: [{ ...milestone, completed: false, showcased: true }] }),
      ).earned.level,
    ).toBe('noob')
  })

  test('earned floor skips old debt and keeps independently frozen capabilities', () => {
    const view = projectKidsJourney(
      kidsJourneyInput({
        policy: configured(),
        earned: { level: 'architect', capabilities: ['pro', 'studio'] },
      }),
    )
    expect(view.earned.level).toBe('architect')
    expect(view.nextLevel).toBe('champion')
    expect(view.missing.every((r) => r.kind === 'slot' && r.tier === 'avancado-2d')).toBe(true)
    expect(view.earned.capabilities).toContain('pro')
    expect(view.earned.capabilities).not.toContain('bridge')
  })

  test('paused stops new earnings even with all milestones', () => {
    const view = projectKidsJourney(
      kidsJourneyInput({
        policy: { schemaVersion: 1, mode: 'paused' },
        milestones: kidsMilestones(),
        earned: { level: 'coder', capabilities: ['studio', 'pinta'] },
      }),
    )
    expect(view.earned).toEqual({ level: 'coder', capabilities: ['studio', 'pinta'] })
    expect(view.missing).toEqual([])
    expect(view.advances).toEqual([])
  })

  test('readiness distinguishes unavailable catalog, legacy gaps and circular explicit courses', () => {
    expect(analyzeKidsJourneyReadiness({ policy: configured(), catalog: null }).status).toBe(
      'unavailable',
    )
    const empty = analyzeKidsJourneyReadiness({
      policy: { schemaVersion: 1, mode: 'legacy' },
      catalog: [],
    })
    expect(empty.status).toBe('incomplete')
    expect(empty.horizon).toBe('noob')
    expect(empty.issues.every((issue) => issue.severity === 'warning')).toBe(true)
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: [
              {
                kind: 'course' as const,
                courseId: kidsCourseId(9),
                milestone: 'complete' as const,
              },
            ],
          }
        : step,
    )
    expect(
      analyzeKidsJourneyReadiness({ policy: { ...policy, steps }, catalog: kidsJourneyFacts() })
        .issues,
    ).toContainEqual(
      expect.objectContaining({ code: 'course-locked', level: 'coder', severity: 'error' }),
    )
  })

  test('reward cycles and non-Kids/live courses are diagnosed', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: [
              {
                kind: 'course' as const,
                courseId: kidsCourseId(0),
                milestone: 'complete' as const,
              },
            ],
          }
        : step,
    )
    for (const patch of [
      { slot: null, journeyRole: 'reward' as const },
      { audience: 'adult' as const },
      { modality: 'live' as const },
    ]) {
      const catalog = kidsJourneyFacts().map((course, index) =>
        index === 0 ? { ...course, ...patch } : course,
      )
      // Preserve a distinct published base: otherwise reward correctly fails open.
      if ('journeyRole' in patch) catalog.push({ ...kidsJourneyFacts()[0]!, id: kidsCourseId(60) })
      const readiness = analyzeKidsJourneyReadiness({ policy: { ...policy, steps }, catalog })
      expect(readiness.issues.some((issue) => issue.severity === 'error')).toBe(true)
    }
  })

  test('unknown catalog never becomes a missing-foundation fail-open', () => {
    expect(() =>
      resolveKidsJourneyCourseLock({
        ...kidsJourneyInput(),
        catalog: null as never,
        course: kidsJourneyFacts()[2]!,
      }),
    ).toThrow('catálogo')
  })

  test('slot requirements also detect a future-tier cycle instead of treating it as a catalog gap', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: [
              {
                kind: 'slot' as const,
                tier: 'iniciante-3d' as const,
                slot: 1,
                milestone: 'complete' as const,
              },
            ],
          }
        : step,
    )
    expect(
      analyzeKidsJourneyReadiness({ policy: { ...policy, steps }, catalog: kidsJourneyFacts() })
        .issues,
    ).toContainEqual(expect.objectContaining({ code: 'course-locked', severity: 'error' }))
  })

  test('configured foundation completion and missing foundation retain honest locks', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: step.requirements.map((r) => ({ ...r, milestone: 'complete' as const })),
          }
        : step,
    )
    const milestones = [...kidsMilestones(1), { ...kidsMilestones(2)[1]!, showcased: false }]
    const input = kidsJourneyInput({ policy: { ...policy, steps }, milestones })
    expect(
      resolveKidsJourneyCourseLock({
        ...input,
        catalog: input.catalog!,
        course: kidsJourneyFacts()[2]!,
      }).locked,
    ).toBe(false)
    expect(
      resolveKidsJourneyCourseLock({
        ...input,
        catalog: input.catalog!,
        milestones: kidsMilestones(1),
        course: kidsJourneyFacts()[2]!,
      }).reason,
    ).toBe('foundation-first')
  })

  test('expanded legacy slots honor the old foundation snapshot after its course is replaced', () => {
    const catalog = kidsJourneyFacts().map((course, index) =>
      index === 1 ? { ...course, id: kidsCourseId(60) } : course,
    )
    const input = kidsJourneyInput({ policy: configured(), milestones: kidsMilestones(2), catalog })
    expect(resolveKidsJourneyCourseLock({ ...input, catalog, course: catalog[2]! }).locked).toBe(
      false,
    )
  })

  test('explicit foundation identity does not borrow the previous occupant of its slot', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: [
              {
                kind: 'course' as const,
                courseId: kidsCourseId(60),
                milestone: 'complete' as const,
              },
              ...step.requirements.slice(1),
            ],
          }
        : step,
    )
    const catalog = kidsJourneyFacts().map((course, index) =>
      index === 1 ? { ...course, id: kidsCourseId(60) } : course,
    )
    const input = kidsJourneyInput({
      policy: { ...policy, steps },
      milestones: kidsMilestones(2),
      catalog,
    })
    expect(resolveKidsJourneyCourseLock({ ...input, catalog, course: catalog[2]! }).reason).toBe(
      'foundation-first',
    )
  })

  test('preview preserves virtual baseline and does not mutate any caller facts', () => {
    const input = kidsJourneyInput({ milestones: kidsMilestones(9) })
    const before = JSON.stringify(input)
    const impact = compareKidsJourney({
      ...input,
      proposedPolicy: { schemaVersion: 1, mode: 'paused' },
    })
    expect(impact.after.earned.level).toBe('hacker')
    expect(impact.preservedCapabilities).toEqual(['studio', 'pinta', 'ai', 'pensa'])
    expect(JSON.stringify(input)).toBe(before)
  })

  test('unknown showcase of an implicit foundation remains unavailable', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 1
        ? {
            ...step,
            requirements: [
              {
                kind: 'course' as const,
                courseId: kidsCourseId(2),
                milestone: 'complete' as const,
              },
            ],
          }
        : step,
    )
    const catalog = kidsJourneyFacts().map((course, index) =>
      index === 1 ? { ...course, hasShowcaseBlock: null } : course,
    )
    const readiness = analyzeKidsJourneyReadiness({ policy: { ...policy, steps }, catalog })
    expect(readiness.status).toBe('unavailable')
    expect(readiness.issues).toContainEqual(
      expect.objectContaining({ code: 'foundation-unavailable', severity: 'unavailable' }),
    )
  })

  test('preview reports milestone edits separately from added or removed requirements', () => {
    const policy = configured()
    const steps = policy.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: step.requirements.map((requirement) => ({
              ...requirement,
              milestone: 'complete' as const,
            })),
          }
        : step,
    )
    const impact = compareKidsJourney({
      ...kidsJourneyInput({ policy }),
      proposedPolicy: { ...policy, steps },
    })
    expect(impact.changes).toHaveLength(1)
    expect(impact.changes[0]!.requirementsAdded).toEqual([])
    expect(impact.changes[0]!.requirementsRemoved).toEqual([])
    expect(impact.changes[0]!.requirementsChanged[0]!.after.milestone).toBe('complete')
  })
})
