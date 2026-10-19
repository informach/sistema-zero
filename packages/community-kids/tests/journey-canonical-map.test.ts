import { expect, test } from 'bun:test'
import { coursesForLevel, trilhaLocked } from '../src/lib/journey-map'
import { course, policy, view } from './fixtures/canonical-journey-map'
import { kidsStaffPreview } from './kids-journey-fixtures'

test('canonical course grouping: normal projection transports the exact active tierAccess rules', () => {
  const configured = policy()
  expect(view(configured)).toHaveProperty('tierAccess', configured.tierAccess)
})

test('canonical course grouping: opensAt changes the presentation owner without an old rank mapping', () => {
  const configured = policy()
  const snapshot = view(configured)
  expect(snapshot.readiness.horizon).toBe('god')
  expect(coursesForLevel('god', [course], snapshot).map((item) => item.courseSlug)).toEqual([
    'base-canonical',
  ])
  expect(coursesForLevel('coder', [course], snapshot)).toEqual([])
})

test('canonical course grouping: retained course access can open a future rank trail without awarding that rank', () => {
  const configured = policy()
  const snapshot = view(configured)
  expect(snapshot.earned.level).toBe('coder')
  expect(trilhaLocked(snapshot, 'god', [course])).toBe(false)
  expect(snapshot.earned.level).toBe('coder')
})

test('canonical course grouping: unknown policy never takes the legacy deep-link fail-open path', () => {
  expect(trilhaLocked(null, 'coder', [course])).toBe(true)
})

test('canonical course grouping: authorized own-team preview uses the same rules without a virtual learner rank', () => {
  const preview = { ...kidsStaffPreview, tierAccess: policy().tierAccess }
  expect(coursesForLevel('god', [course], preview).map((item) => item.courseId)).toEqual([
    course.courseId,
  ])
  expect(coursesForLevel('coder', [course], preview)).toEqual([])
  expect(trilhaLocked(preview, 'god', [])).toBe(false)
  expect(preview).not.toHaveProperty('earned')
})
