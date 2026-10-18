import { describe, expect, test } from 'bun:test'
import {
  CREATOR_JOURNEY_LEVELS,
  computeJourneyLevelSlug,
  type JOURNEY_COURSE_TIERS,
  type QualifiedJourneySlots,
  resolveJourneyCourseLock,
} from '../src/journey/catalog'
import { kidsJourneySteps } from '../src/journey/kids-policy'
import { projectKidsJourney, resolveKidsJourneyCourseLock } from '../src/journey/kids-projection'
import { kidsJourneyFacts, kidsJourneyInput, kidsMilestones } from './fixtures/kids-journey'

describe('Kids default preserves the legacy journey', () => {
  test('keeps 49 incremental positions and the seven fixed advances', () => {
    const steps = kidsJourneySteps({ schemaVersion: 1, mode: 'legacy' })
    expect(steps.map((step) => step.level)).toEqual([
      'coder',
      'hacker',
      'explorer',
      'elite',
      'architect',
      'champion',
      'god',
    ])
    expect(steps.map((step) => step.requirements.length)).toEqual([1, 8, 8, 8, 8, 8, 8])
    expect(steps.flatMap((step) => step.requirements)).toHaveLength(49)
    expect(
      steps.flatMap((step) => step.requirements).every((r) => r.milestone === 'showcase'),
    ).toBe(true)
  })

  test('matches every prefix, missing position, and reversed milestone order', () => {
    const all = kidsMilestones()
    const cases = [
      ...Array.from({ length: 50 }, (_, count) => all.slice(0, count)),
      ...all.map((_, missing) => all.filter((__, index) => index !== missing)),
      [...all].reverse(),
    ]
    for (const milestones of cases) {
      const qualified: Partial<Record<(typeof JOURNEY_COURSE_TIERS)[number], number[]>> = {}
      for (const milestone of milestones) {
        if (milestone.qualifiedTier && milestone.qualifiedSlot !== null) {
          qualified[milestone.qualifiedTier] ??= []
          qualified[milestone.qualifiedTier]!.push(milestone.qualifiedSlot)
        }
      }
      const view = projectKidsJourney(kidsJourneyInput({ milestones }))
      expect(view.earned.level).toBe(computeJourneyLevelSlug(qualified))
    }
  })

  test('preserves exact capability boundaries independent of licenses and palette', () => {
    const boundaries = [0, 1, 9, 17, 25, 33, 41, 49]
    const expected = [
      [],
      ['studio', 'pinta'],
      ['studio', 'pinta', 'ai', 'pensa'],
      ['studio', 'pinta', 'ai', 'pensa', 'molda'],
      ['studio', 'pinta', 'ai', 'pensa', 'molda'],
      ['studio', 'pinta', 'ai', 'pensa', 'molda', 'molda-intermediate'],
      ['studio', 'pinta', 'bridge', 'ai', 'pensa', 'molda', 'molda-intermediate'],
      [
        'studio',
        'pinta',
        'bridge',
        'pro',
        'ai',
        'pensa',
        'molda',
        'molda-intermediate',
        'molda-professional',
      ],
    ] as const
    boundaries.forEach((count, index) => {
      const view = projectKidsJourney(kidsJourneyInput({ milestones: kidsMilestones(count) }))
      expect(view.earned.level).toBe(CREATOR_JOURNEY_LEVELS[index]!.slug)
      expect(view.earned.capabilities).toEqual(expected[index]!)
    })
  })

  test('does not need the current catalog to honor a qualified snapshot', () => {
    const milestones = kidsMilestones(9)
    expect(projectKidsJourney(kidsJourneyInput({ milestones, catalog: [] })).earned.level).toBe(
      'hacker',
    )
    expect(projectKidsJourney(kidsJourneyInput({ milestones, catalog: null })).earned.level).toBe(
      'hacker',
    )
  })

  test('same course must have both milestones; bonus and repeated slots do not replace gaps', () => {
    const [entry] = kidsMilestones(1)
    const milestones = [
      { ...entry!, showcased: false },
      { ...entry!, courseId: 'another-course', completed: false },
    ]
    expect(projectKidsJourney(kidsJourneyInput({ milestones })).earned.level).toBe('noob')
    expect(
      projectKidsJourney(kidsJourneyInput({ milestones: [{ ...entry!, qualifiedSlot: null }] }))
        .earned.level,
    ).toBe('noob')
    expect(
      projectKidsJourney(kidsJourneyInput({ milestones: [entry!, entry!] })).earned.level,
    ).toBe('coder')
  })

  test('course locks match legacy for each rank, role and foundation state', () => {
    for (const definition of CREATOR_JOURNEY_LEVELS) {
      const qualified = definition.requiredSlots as QualifiedJourneySlots
      const milestones = kidsMilestones().filter((milestone) =>
        qualified[milestone.qualifiedTier!]?.includes(milestone.qualifiedSlot!),
      )
      for (const course of kidsJourneyFacts()) {
        for (const foundationAvailable of [true, false]) {
          const catalog = foundationAvailable
            ? kidsJourneyFacts()
            : kidsJourneyFacts().filter(
                (candidate) => candidate.tier !== course.tier || candidate.slot !== 1,
              )
          for (const role of ['positioned', 'reward', 'extra'] as const) {
            const candidate = {
              ...course,
              slot: role === 'positioned' ? course.slot : null,
              journeyRole: role,
            }
            expect(
              resolveKidsJourneyCourseLock({
                ...kidsJourneyInput({ milestones, catalog }),
                catalog,
                course: candidate,
              }),
            ).toEqual(
              resolveJourneyCourseLock(
                qualified,
                course.tier!,
                candidate.slot,
                foundationAvailable,
                role,
              ),
            )
          }
        }
      }
    }
  })
})
