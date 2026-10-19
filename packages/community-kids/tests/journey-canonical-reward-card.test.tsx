import { afterEach, expect, test } from 'bun:test'
import {
  initialKidsJourneyPolicy,
  type JourneyLevelSlug,
  type KidsJourneyCourseFact,
  type KidsJourneyEarned,
  type KidsJourneyPolicy,
  projectKidsJourney,
  resolveKidsJourneyCourseLock,
} from '@sistemazero/core/journey'
import { cleanup, render, screen } from '@testing-library/react'
import { CatalogCourseCard } from '../src/components/kids/catalog-course-card'
import { course, facts } from './fixtures/canonical-journey-map'

afterEach(cleanup)

const tier = 'iniciante-2d' as const
const bonus = facts.find((fact) => fact.journeyRole === 'extra')!
const reward: KidsJourneyCourseFact = {
  ...facts.find((fact) => fact.tier === tier && fact.slot === 1)!,
  id: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
  slot: null,
  journeyRole: 'reward',
}
const catalog = [...facts, reward]
const milestones = facts
  .filter((fact) => fact.tier === tier || fact.tier === 'primeiros-passos-2d')
  .map((fact) => ({
    courseId: fact.id,
    completed: true,
    showcased: true,
    qualifiedTier: fact.tier,
    qualifiedSlot: fact.slot,
  }))
const floor: KidsJourneyEarned = {
  level: 'coder',
  capabilities: ['studio', 'pinta'],
  courseAccess: { entry: [tier], expanded: [tier], reward: [] },
}

function policy(completedAt: JourneyLevelSlug): KidsJourneyPolicy {
  const seed = initialKidsJourneyPolicy()
  return {
    ...seed,
    steps: seed.steps.map((step) =>
      step.level === 'hacker'
        ? { ...step, requirements: [{ kind: 'course', courseId: bonus.id, milestone: 'complete' }] }
        : step,
    ),
    tierAccess: seed.tierAccess.map((rule) =>
      rule.tier === tier ? { ...rule, completedAt } : rule,
    ),
  }
}

function input(configured = policy('god'), earned = floor) {
  return { policy: configured, policyVersion: 2, catalog, milestones, earned }
}

function card(careerLock: ReturnType<typeof resolveKidsJourneyCourseLock>) {
  return render(
    <CatalogCourseCard
      course={{
        ...course,
        courseId: reward.id,
        courseSlug: 'premio',
        careerSlot: null,
        journeyRole: 'reward',
        careerLock,
      }}
      salesUrl={null}
    />,
  )
}

for (const [requiredLevel, label] of [
  ['god', 'Lenda'],
  ['hacker', 'Inventor(a)'],
] as const) {
  test(`canonical reward card: the actual ${requiredLevel} gate replaces the fixed finish-trail promise`, () => {
    const current = input(policy(requiredLevel))
    const snapshot = projectKidsJourney(current)
    expect(milestones.filter((milestone) => milestone.qualifiedTier === tier)).toHaveLength(8)
    expect(snapshot.readiness.status).toBe('ready')
    expect(snapshot.earned.level).toBe('coder')
    expect(snapshot.missing).toEqual([
      { kind: 'course', courseId: bonus.id, milestone: 'complete' },
    ])
    const lock = resolveKidsJourneyCourseLock({ ...current, course: reward })
    expect(lock).toMatchObject({ locked: true, reason: 'tier-reward', requiredLevel })
    const rendered = card(lock)
    expect(rendered.container.textContent).toContain(label)
    expect(screen.queryByText(/Abre quando você terminar a trilha/)).toBeNull()
    expect(rendered.container.querySelector('a')).toBeNull()
  })
}

test('canonical reward card: a retained reward remains accessible below the configured rank', () => {
  const current = input(policy('god'), {
    ...floor,
    courseAccess: { ...floor.courseAccess, reward: [tier] },
  })
  expect(projectKidsJourney(current).earned.level).toBe('coder')
  const lock = resolveKidsJourneyCourseLock({ ...current, course: reward })
  expect(lock).toEqual({ locked: false })
  card(lock)
  expect(screen.getByText('Liberado')).toBeTruthy()
  expect(screen.getByRole('link').getAttribute('href')).toBe('/cursos/premio')
})

test('canonical reward card: a known missing open foundation grants reward without inventing entry', () => {
  const current = {
    ...input(),
    catalog: catalog.filter((fact) => !(fact.tier === tier && fact.slot === 1)),
    milestones: [],
    earned: {
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    } satisfies KidsJourneyEarned,
  }
  const snapshot = projectKidsJourney(current)
  expect(snapshot.earned.level).toBe('noob')
  expect(snapshot.earned.courseAccess.entry).not.toContain(tier)
  expect(snapshot.earned.courseAccess.reward).toContain(tier)
  const lock = resolveKidsJourneyCourseLock({ ...current, course: reward })
  expect(lock).toEqual({ locked: false })
  card(lock)
  expect(screen.getByText('Liberado')).toBeTruthy()
})
