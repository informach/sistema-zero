import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, sectionCompletionIssues } from '@sistemazero/core/learning'
import {
  gradeStudioActivity,
  validateStudioActivityAuthoring,
} from '../../src/domain/course/studio-activity'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

// Existing publication remains playable; stricter criteria apply to the next publication.
test('uma seção legada com correção híbrida conclui após aprovação sem liberar nova publicação incompatível', async () => {
  const env = buildApp(),
    course = seedSampleCourse(env.courses)
  const userId = randomUUID(),
    lessonId = course.lessonIds[0]!,
    blockId = randomUUID()
  grantLifetime(env.entitlements, { userId, courseRef: course.slug })
  const activity = {
    instructions: 'Repita e execute',
    passingScore: 100,
    checks: [
      {
        id: 'loop',
        label: 'Usar repetição',
        kind: 'structure' as const,
        weight: 9,
        rule: { type: 'usesLoop' as const },
      },
      { id: 'runtime', label: 'Executar', kind: 'code' as const, weight: 1, source: 'return true' },
    ],
  }
  expect(validateStudioActivityAuthoring(activity)).toBeNull()
  expect(
    gradeStudioActivity(activity, { ir: { js: [{ type: 'repeat' }] } }, [
      { checkId: 'runtime', passed: true },
    ]).passed,
  ).toBe(true)
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 0,
    contentRevision: 'a'.repeat(32),
    content: { kind: 'studio', initialProject: {}, activity },
  })
  const section = {
    ...defaultLessonSection(randomUUID(), 'Entrega', [blockId]),
    intent: 'closing' as const,
    completion: { version: 1 as const, blockIds: [blockId] },
  }
  env.learningRepository.structures.set(lessonId, { revision: randomUUID(), sections: [section] })
  await env.studioSubmissions.upsert({
    id: randomUUID(),
    userId,
    accountId: userId,
    lessonId,
    courseId: course.courseId,
    blockId,
    project: {},
    submittedAt: new Date(),
    passedAt: new Date(),
    score: 100,
  })
  const response = await env.app.handle(
    new Request(`http://localhost/members/courses/${course.slug}/lessons/${lessonId}`, {
      headers: { 'x-auth-user-id': userId },
    }),
  )
  expect(response.status).toBe(200)
  const payload = (await response.json()) as {
    sectionProgress: { completed: number; sections: { pending: string[] }[] }
  }
  expect(payload.sectionProgress.completed).toBe(1)
  expect(payload.sectionProgress.sections[0]?.pending).toEqual([])
  expect(
    sectionCompletionIssues([section], env.courses.blocks).some((issue) =>
      issue.message.includes('apenas checagens estruturais'),
    ),
  ).toBe(true)
})
