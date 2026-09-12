import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantAllKidsCourses, seedSampleCourse } from '../helpers'

test('course detail exposes publication milestone and a reachable lesson, isolated per profile', async () => {
  const { app, courses, entitlements, gamification, progress } = buildApp()
  const account = randomUUID()
  const student = randomUUID()
  const sibling = randomUUID()
  const seeded = seedSampleCourse(
    courses,
    'entrada',
    'published',
    'kids',
    true,
    'primeiros-passos',
    '2d',
    1,
  )
  const [lesson1, lesson2] = seeded.lessonIds
  courses.blocks.push({
    id: randomUUID(),
    lessonId: lesson2,
    kind: 'ebook',
    sortOrder: 1,
    content: {
      kind: 'ebook',
      title: 'Caderno do Dino',
      url: 'https://private.example/caderno.pdf',
    },
  })
  grantAllKidsCourses(entitlements, { userId: account })
  courses.blocks.push({
    id: randomUUID(),
    lessonId: lesson2,
    kind: 'studio',
    sortOrder: 0,
    content: {
      kind: 'studio',
      initialProject: { name: 'Meu jogo', files: { 'index.html': '' } },
      showcase: { enabled: true, title: 'Meu jogo' },
    },
  })
  const read = async (userId: string) => {
    const response = await app.handle(
      new Request('http://localhost/members/courses/entrada', {
        headers: { 'x-auth-user-id': userId, 'x-auth-account-id': account },
      }),
    )
    expect(response.status).toBe(200)
    return response.json()
  }
  expect(await read(student)).toMatchObject({
    milestones: { completed: false, showcased: false },
    showcaseLessonId: null,
    materialLessonIds: [lesson1],
  }) // Sequentially locked; first completion must still know publication is outstanding.
  await progress.markComplete(student, lesson1, seeded.courseId, new Date())
  await gamification.award({
    userId: student,
    accountId: account,
    audience: 'kids',
    events: [{ sourceType: 'course_complete', sourceId: seeded.courseId, amount: 0 }],
    today: '2026-06-02',
    now: new Date('2026-06-02'),
    privileged: false,
  })
  expect(await read(student)).toMatchObject({
    milestones: { completed: true, showcased: false },
    showcaseLessonId: lesson2,
    materialLessonIds: [lesson1, lesson2],
  })
  expect(await read(sibling)).toMatchObject({
    showcaseLessonId: null,
    materialLessonIds: [lesson1],
  })
  expect(JSON.stringify(await read(student))).not.toContain('private.example')
  expect(await read(sibling)).not.toHaveProperty('milestones.completed', true)
  const lesson = courses.lessons.find((item) => item.id === lesson2)
  if (!lesson) throw new Error('Missing fixture lesson')
  lesson.isPublished = false
  expect(await read(student)).toMatchObject({
    milestones: { completed: true, showcased: false },
    showcaseLessonId: null,
    materialLessonIds: [lesson1],
  })
})
