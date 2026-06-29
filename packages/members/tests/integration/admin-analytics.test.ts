import { describe, expect, test } from 'bun:test'
import { buildApp, seedSampleCourse } from '../helpers'

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const readJson = (res: Response): Promise<any> => res.json()
type App = ReturnType<typeof buildApp>['app']
const get = (app: App, path: string) => app.handle(new Request(`http://localhost${path}`))

describe('Members HTTP — admin: analytics de aprendizado', () => {
  test('overview: started/completed/taxa por curso', async () => {
    const { app, courses, progress } = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(courses, 'curso-analytics')
    const [l1, l2] = lessonIds
    const now = new Date('2026-06-02T00:00:00.000Z')
    // A concluiu as 2 aulas (completou o curso); B só a 1ª (engajou, não completou).
    await progress.markComplete(A, l1, courseId, now)
    await progress.markComplete(A, l2, courseId, now)
    await progress.markComplete(B, l1, courseId, now)

    const body = await readJson(await get(app, '/members/admin/analytics/courses'))
    const row = body.courses.find((c: { courseRef: string }) => c.courseRef === 'curso-analytics')
    expect(row).toMatchObject({
      publishedLessons: 2,
      started: 2,
      completed: 1,
      completionRate: 50,
    })
  })

  test('funil: conclusões por aula na ordem do curso (detecta queda)', async () => {
    const { app, courses, progress } = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(courses, 'curso-funil')
    const [l1, l2] = lessonIds
    const now = new Date('2026-06-02T00:00:00.000Z')
    await progress.markComplete(A, l1, courseId, now)
    await progress.markComplete(B, l1, courseId, now)
    await progress.markComplete(A, l2, courseId, now)

    const body = await readJson(await get(app, `/members/admin/analytics/courses/${courseId}`))
    expect(body.started).toBe(2)
    expect(body.completed).toBe(1)
    expect(body.lessons.map((l: { completions: number }) => l.completions)).toEqual([2, 1])
    expect(body.lessons[0].title).toBe('Aula composta')
  })

  test('curso rascunho fica fora do overview', async () => {
    const { app, courses } = buildApp()
    seedSampleCourse(courses, 'curso-rascunho', 'draft')
    const body = await readJson(await get(app, '/members/admin/analytics/courses'))
    expect(body.courses.some((c: { courseRef: string }) => c.courseRef === 'curso-rascunho')).toBe(
      false,
    )
  })

  test('funil de curso rascunho vem vazio (espelha o overview)', async () => {
    const { app, courses, progress } = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(courses, 'curso-funil-draft', 'draft')
    const now = new Date('2026-06-02T00:00:00.000Z')
    // Mesmo com conclusões no banco, curso rascunho não é medido.
    await progress.markComplete(A, lessonIds[0], courseId, now)
    await progress.markComplete(A, lessonIds[1], courseId, now)

    const body = await readJson(await get(app, `/members/admin/analytics/courses/${courseId}`))
    expect(body).toMatchObject({ started: 0, completed: 0, lessons: [] })
  })

  test('funil de curso inexistente vem vazio', async () => {
    const { app } = buildApp()
    const ghost = '99999999-9999-9999-9999-999999999999'
    const body = await readJson(await get(app, `/members/admin/analytics/courses/${ghost}`))
    expect(body).toMatchObject({ courseId: ghost, started: 0, completed: 0, lessons: [] })
  })
})
