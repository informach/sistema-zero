import { afterEach, expect, test } from 'bun:test'
import { initialKidsJourneyPolicy, resolveKidsJourneyCourseLock } from '@sistemazero/core/journey'
import { cleanup, render, screen } from '@testing-library/react'
import { KidsLockedCourse } from '../src/components/kids/kids-locked-course'
import { facts } from './fixtures/canonical-journey-map'

afterEach(cleanup)
const tier = 'iniciante-2d' as const
const base = facts.find((fact) => fact.tier === tier && fact.slot === 1)!
const pair = facts.find((fact) => fact.tier === tier && fact.slot === 2)!
const reward = {
  ...base,
  id: 'ffffffff-ffff-4fff-8fff-fffffffffff2',
  slot: null,
  journeyRole: 'reward' as const,
}

function input() {
  const seed = initialKidsJourneyPolicy()
  return {
    policy: {
      ...seed,
      tierAccess: seed.tierAccess.map((rule) =>
        rule.tier === tier
          ? {
              ...rule,
              completedAt: 'god' as const,
              foundation: { ...rule.foundation, milestone: 'complete' as const },
            }
          : rule,
      ),
    },
    policyVersion: 2,
    catalog: [...facts, reward],
    milestones: [],
    earned: {
      level: 'coder' as const,
      capabilities: [],
      courseAccess: { entry: [tier], expanded: [], reward: [] },
    },
  }
}

test('canonical locked course: reward names the actual required post instead of a fixed trail/publication promise', () => {
  const lock = resolveKidsJourneyCourseLock({ ...input(), course: reward })
  expect(lock).toMatchObject({ locked: true, reason: 'tier-reward', requiredLevel: 'god' })
  const rendered = render(<KidsLockedCourse {...lock} />)
  expect(rendered.container.textContent).toContain('Lenda')
  expect(rendered.container.textContent).not.toContain('fechar a trilha')
  expect(rendered.container.textContent).not.toContain('publique')
  expect(screen.getByRole('link', { name: 'Ver minhas aventuras' }).getAttribute('href')).toBe(
    '/cursos',
  )
})

test('canonical locked course: complete-only foundation does not invent a Mural debt', () => {
  const current = input()
  const lock = resolveKidsJourneyCourseLock({ ...current, course: pair })
  expect(lock).toMatchObject({ locked: true, reason: 'foundation-first' })
  const afterComplete = resolveKidsJourneyCourseLock({
    ...current,
    course: pair,
    milestones: [
      {
        courseId: base.id,
        completed: true,
        showcased: false,
        qualifiedTier: tier,
        qualifiedSlot: 1,
      },
    ],
  })
  expect(afterComplete).toEqual({ locked: false })
  const rendered = render(<KidsLockedCourse {...lock} />)
  expect(rendered.container.textContent).not.toContain('publique')
  expect(rendered.container.textContent).not.toContain('Mural')
  expect(screen.getByRole('link', { name: 'Ver minhas aventuras' })).toBeTruthy()
})

test('canonical locked course: missing reward identity remains explicit instead of becoming Faísca', () => {
  const rendered = render(<KidsLockedCourse reason="tier-reward" />)
  expect(rendered.container.textContent).toContain('O posto necessário está indisponível')
  expect(rendered.container.textContent).not.toContain('Faísca')
  expect(rendered.container.textContent).not.toContain('publique')
})

test('canonical locked course: a future course names the same required identity supplied by the server', () => {
  const current = input()
  const lock = resolveKidsJourneyCourseLock({
    ...current,
    course: base,
    earned: { ...current.earned, courseAccess: { entry: [], expanded: [], reward: [] } },
    policy: {
      ...current.policy,
      tierAccess: current.policy.tierAccess.map((rule) =>
        rule.tier === tier ? { ...rule, opensAt: 'hacker' } : rule,
      ),
    },
  })
  expect(lock).toMatchObject({ locked: true, reason: 'future-tier', requiredLevel: 'hacker' })
  const rendered = render(<KidsLockedCourse {...lock} />)
  expect(rendered.container.textContent).toContain('Inventor(a)')
  expect(rendered.container.textContent).not.toContain('Mural')
})
