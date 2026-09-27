import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { LessonLearningReport } from '@sistemazero/core/learning'
import { buildApp, seedSampleCourse } from '../helpers'

test('admin report links to all evidence pages, including removed sections and older payloads', async () => {
  const env = buildApp(),
    course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]!,
    userId = randomUUID(),
    accountId = randomUUID()
  const rows = Array.from({ length: 102 }, (_, index) => ({
    id: randomUUID(),
    kind: 'studio' as const,
    sectionId: randomUUID(),
    blockId: randomUUID(),
    revision: 'original',
    createdAt: new Date(Date.UTC(2026, 8, 12, 0, 0, index)).toISOString(),
    payload: { project: { saved: index }, score: 100 },
  })).reverse()
  env.learningRepository.evidence.set(`${accountId}:${userId}:${lessonId}`, rows)
  const query = new URLSearchParams({ userId, accountId })
  const headers = {
    'x-auth-user-id': randomUUID(),
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
  }
  const request = (path: string) =>
    env.app.handle(
      new Request(`http://localhost/members/admin/lessons/${lessonId}/${path}`, { headers }),
    )
  const response = await request(`learning-report?${query}`)
  expect(response.status).toBe(200)
  const report = (await response.json()) as LessonLearningReport
  expect(report.evidence).toHaveLength(100)
  expect(report.evidenceNextCursor).toBe(rows[99]?.id)
  const page = await request(`learning-evidence?${query}&beforeId=${report.evidenceNextCursor}`)
  expect(page.status).toBe(200)
  expect(await page.json()).toEqual({ items: rows.slice(100), nextCursor: null })
  const full = await request(`learning-evidence/${rows.at(-1)?.id}?${query}`)
  expect(full.status).toBe(200)
  expect(await full.json()).toMatchObject({ payload: { project: { saved: 0 } } })
  const invalid = await request(`learning-evidence?${query}&beforeId=invalid`)
  expect(invalid.status).toBe(400)
})
