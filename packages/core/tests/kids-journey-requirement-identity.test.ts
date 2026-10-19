import { expect, test } from 'bun:test'
import { projectKidsJourney } from '../src/journey/kids-projection'
import {
  kidsCourseId,
  kidsJourneyFacts,
  kidsJourneyInput,
  kidsMilestones,
} from './fixtures/kids-journey'

function first(input = kidsJourneyInput()) {
  return projectKidsJourney(input).advances[0]!.requirements[0]!
}

test('requirement identity: a unique slot uses the course from the evaluated capture', () => {
  const requirement = first()
  expect(requirement.state).toBe('pending')
  expect(requirement.resolvedCourseId).toBe(kidsCourseId(0))
})

test('requirement identity: an explicit normal course outside the ladder is identified by its canonical ID', () => {
  const input = kidsJourneyInput()
  const bonus = {
    ...input.catalog![0]!,
    id: kidsCourseId(99),
    tier: null,
    slot: null,
    journeyRole: 'extra' as const,
  }
  const policy = {
    ...input.policy,
    steps: input.policy.steps.map((step, index) =>
      index === 0
        ? {
            ...step,
            requirements: [
              { kind: 'course' as const, courseId: bonus.id, milestone: 'complete' as const },
            ],
          }
        : step,
    ),
  }
  const view = projectKidsJourney({ ...input, policy, catalog: [...input.catalog!, bonus] })
  expect(view.readiness.status).toBe('ready')
  expect(view.advances[0]!.requirements[0]!.resolvedCourseId).toBe(bonus.id)
  expect(view.advances[0]!.requirements[0]!.state).toBe('pending')
})

test('requirement identity: ambiguous slot candidates cannot select a replacement course', () => {
  const catalog = kidsJourneyFacts()
  const input = kidsJourneyInput({
    catalog: [...catalog, { ...catalog[0]!, id: kidsCourseId(99) }],
  })
  expect(first(input).resolvedCourseId).toBeNull()
  expect(first(input).state).toBe('pending')
})

test('requirement identity: unavailable catalog or unpublished course does not provide a course action', () => {
  expect(first(kidsJourneyInput({ catalog: null })).resolvedCourseId).toBeNull()
  const catalog = kidsJourneyFacts().map((course, index) =>
    index === 0 ? { ...course, status: 'draft' as const } : course,
  )
  expect(first(kidsJourneyInput({ catalog })).state).toBe('unavailable')
  expect(first(kidsJourneyInput({ catalog })).resolvedCourseId).toBeNull()
})

test('requirement identity: satisfied history without catalog identity remains earned and creates no new debt', () => {
  for (const catalog of [null, kidsJourneyFacts().slice(1)]) {
    const view = projectKidsJourney(kidsJourneyInput({ catalog, milestones: kidsMilestones(1) }))
    expect(view.advances[0]!.requirements[0]!.state).toBe('satisfied')
    expect(view.advances[0]!.requirements[0]!.resolvedCourseId).toBeNull()
    expect(view.earned.level).toBe('coder')
    expect(
      view.missing.some(
        (requirement) => requirement.kind === 'slot' && requirement.tier === 'primeiros-passos-2d',
      ),
    ).toBe(false)
  }
})
