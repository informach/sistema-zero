import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy, projectKidsJourney } from '@sistemazero/core/journey'
import { kidsStudentLevel } from '../../src/application/kids-journey/kids-student-level'

function view() {
  return projectKidsJourney({ policy: initialKidsJourneyPolicy(), policyVersion: 8,
    catalog: [], milestones: [], earned: { level: 'coder', capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] } } })
}

test('rank display uses canonical earned and missing requirements rather than hardcoded thresholds', () => {
  const current = view()
  current.missing = [
    { kind: 'course', courseId: randomUUID(), milestone: 'complete' },
    { kind: 'slot', tier: 'avancado-3d', slot: 2, milestone: 'complete' },
    { kind: 'slot', tier: 'avancado-3d', slot: 3, milestone: 'showcase' },
  ]
  expect(kidsStudentLevel(current)).toEqual({ slug: 'coder', next: 'hacker', remaining: {
    any: 1, 'primeiros-passos-2d': 0, 'iniciante-2d': 0, 'iniciante-3d': 0,
    'intermediario-2d': 0, 'intermediario-3d': 0, 'avancado-2d': 0, 'avancado-3d': 2,
  } })
  expect(current.missing).toHaveLength(3)
})

test('top and pause retain the canonical display without inventing new achievements', () => {
  const current = view()
  current.earned = { ...current.earned, level: 'god' }
  current.nextLevel = null
  current.mode = 'paused'
  expect(kidsStudentLevel(current)).toEqual({ slug: 'god', next: null, remaining: null })
})
