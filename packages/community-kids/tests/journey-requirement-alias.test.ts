import { expect, test } from 'bun:test'
import { initialKidsJourneyPolicy, projectKidsJourney } from '@sistemazero/core/journey'
import { canonicalJourneyProgress } from '../src/lib/journey-presentation'
import { facts } from './fixtures/canonical-journey-map'

test('canonical progress: slot and explicit references to one course retain both milestones without inventing a second adventure', () => {
  const seed = initialKidsJourneyPolicy()
  const first = facts[0]!
  const policy = {
    ...seed,
    steps: seed.steps.map((step) =>
      step.level === 'hacker'
        ? {
            ...step,
            requirements: [
              {
                kind: 'slot' as const,
                tier: 'primeiros-passos-2d' as const,
                slot: 1,
                milestone: 'complete' as const,
              },
              { kind: 'course' as const, courseId: first.id, milestone: 'showcase' as const },
            ],
          }
        : step,
    ),
  }
  const journey = projectKidsJourney({
    policy,
    policyVersion: 2,
    catalog: facts,
    milestones: [],
    earned: {
      level: 'coder',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
  expect(journey.readiness.status).toBe('ready')
  expect(journey.nextLevel).toBe('hacker')
  expect(journey.missing).toHaveLength(2)
  expect(
    journey.advances
      .find((advance) => advance.level === 'hacker')!
      .requirements.map((item) => item.state),
  ).toEqual(['pending', 'pending'])
  const progress = canonicalJourneyProgress(journey)
  if (progress.kind !== 'pending') throw new Error('Expected pending canonical progress')
  expect(progress.remaining).toBe(1)
  expect(progress.hint).toContain('Falta 1 aventura')
  expect(progress.hint).toContain('publique')
  expect(journey.missing).toHaveLength(2)
})
