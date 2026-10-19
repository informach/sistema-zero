// The server module replacement stays in this isolated child, never the shared suite.
import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { projectKidsJourney } from '@sistemazero/core/journey'
import { cleanup, render, screen } from '@testing-library/react'
import { kidsStudentLevel } from '../../../members/src/application/kids-journey/kids-student-level'
import type { CatalogCourseView } from '../../src/lib/types'
import { kidsStaffPreview } from '../kids-journey-fixtures'
import { course, facts, policy, view } from './canonical-journey-map'

const bonus = {
  ...course,
  courseId: facts.at(-1)!.id,
  courseSlug: 'bonus-fora-da-escada',
  title: 'Aventura necessária fora da trilha',
  level: 'primeiros-passos',
  track: '3d',
  careerSlot: null,
  journeyRole: 'extra' as const,
} satisfies CatalogCourseView
let journey = view()
let catalog: CatalogCourseView[] = [course, bonus]
let staff = false
beforeEach(() => {
  journey = view()
  catalog = [course, bonus]
  staff = false
})
mock.module('@/server/members', () => ({
  listCatalog: async () => ({ status: 200, body: { courses: catalog } }),
  getGamificationReadonly: async () => ({
    status: 200,
    body: {
      xp: 42,
      streak: { current: 0, best: 0, activeToday: false },
      badges: [],
      ...(staff
        ? { level: null, kidsPreview: kidsStaffPreview }
        : { level: kidsStudentLevel(journey), kidsJourney: journey }),
    },
  }),
  checkStudioAccessReadonly: async () => ({
    status: 200,
    body: { access: { 'estudio-completo': false } },
  }),
  listMyCourses: async () => ({ status: 200, body: { courses: [] } }),
  getStudioUnlocksReadonly: async () => ({ status: 503, body: null }),
}))
const { default: CatalogPage } = await import('../../src/app/(app)/cursos/page')
afterEach(cleanup)

test('canonical required courses: the real catalog page offers an explicit pending course outside tier groups', async () => {
  expect(journey.readiness.status).toBe('ready')
  expect(journey.nextLevel).toBe('hacker')
  expect(
    journey.advances.find((advance) => advance.level === 'hacker')!.requirements[0]!.requirement,
  ).toEqual({
    kind: 'course',
    courseId: bonus.courseId,
    milestone: 'complete',
  })
  render(await CatalogPage())
  expect(screen.getByText(bonus.title)).toBeTruthy()
  const courseLink = screen
    .getAllByRole('link')
    .find((link) => link.getAttribute('href') === `/cursos/${bonus.courseSlug}`)
  expect(Boolean(courseLink)).toBe(true)
  expect(screen.getByText(/Termine esta aventura/)).toBeTruthy()
  expect(screen.queryAllByText(/Publique.*Mural/).length).toBe(0)
})

test('canonical required courses: enrollment remains required for the outside course', async () => {
  catalog = [course, { ...bonus, hasAccess: false, salesPageUrl: 'https://example.test/aventura' }]
  render(await CatalogPage())
  expect(screen.getByText(bonus.title)).toBeTruthy()
  const link = screen
    .getAllByRole('link')
    .find((item) => item.getAttribute('href') === 'https://example.test/aventura')
  expect(link?.textContent).toContain('Mostrar ao responsável')
  expect(
    screen
      .getAllByRole('link')
      .some((item) => item.getAttribute('href') === `/cursos/${bonus.courseSlug}`),
  ).toBe(false)
})

test('canonical required courses: a current server career lock cannot become a course link', async () => {
  catalog = [
    course,
    { ...bonus, careerLock: { locked: true, reason: 'future-tier', requiredLevel: 'god' } },
  ]
  render(await CatalogPage())
  expect(screen.getByText(bonus.title)).toBeTruthy()
  expect(
    screen
      .getAllByRole('link')
      .some((item) => item.getAttribute('href') === `/cursos/${bonus.courseSlug}`),
  ).toBe(false)
})

test('canonical required courses: pause retains the learner but offers no promotion task', async () => {
  journey = { ...journey, mode: 'paused' }
  render(await CatalogPage())
  expect(screen.getByText(/Suas conquistas estão guardadas/)).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Próximas aventuras' })).toBeNull()
})

test('canonical required courses: staff preview offers no child promotion or earned rank', async () => {
  staff = true
  render(await CatalogPage())
  expect(screen.getByRole('heading', { name: 'Prévia das aventuras' })).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Próximas aventuras' })).toBeNull()
  expect(screen.queryByText(/Você é /)).toBeNull()
})

test('canonical required courses: absent evaluated identity never substitutes a catalog course', async () => {
  const configured = policy()
  journey = projectKidsJourney({
    policy: {
      ...configured,
      steps: configured.steps.map((advance) =>
        advance.level === 'hacker'
          ? {
              ...advance,
              requirements: [
                { kind: 'slot', tier: 'primeiros-passos-2d', slot: 1, milestone: 'complete' },
              ],
            }
          : advance,
      ),
    },
    policyVersion: 2,
    milestones: [],
    earned: journey.earned,
    catalog: facts.map((fact) =>
      fact.id === bonus.courseId ? { ...facts[0]!, id: bonus.courseId } : fact,
    ),
  })
  expect(
    journey.advances.find((advance) => advance.level === 'hacker')!.requirements[0]!
      .resolvedCourseId,
  ).toBeNull()
  render(await CatalogPage())
  expect(screen.queryByRole('region', { name: 'Próximas aventuras' })).toBeNull()
  expect(screen.queryByText(bonus.title)).toBeNull()
})
