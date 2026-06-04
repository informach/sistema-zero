import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const get = (app: App, path: string) =>
  app.handle(new Request(`http://localhost${path}`, { headers: authHeaders }))

describe('Resolução de download de anexo (server↔server, BFF do community)', () => {
  test('com matrícula → storageRef + metadados; o GET da aula NÃO expõe url', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const attachment = courses.attachments.find((a) => a.lessonId === lessonId)
    if (!attachment) throw new Error('seed sem anexo')

    // O GET da aula (member-facing) não traz a localização real.
    const lesson = await get(app, `/members/courses/${course.slug}/lessons/${lessonId}`)
    expect(lesson.status).toBe(200)
    const lessonBody = await readJson(lesson)
    expect(lessonBody.attachments[0].id).toBe(attachment.id)
    expect(lessonBody.attachments[0].url).toBeUndefined()

    // A rota de resolução (consumida só pelo servidor do community) traz.
    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}/attachments/${attachment.id}/resolve`,
    )
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({
      label: 'Slides (PDF)',
      fileType: 'application/pdf',
      sizeBytes: null,
      storageRef: 'https://x/a.pdf',
    })
  })

  test('sem matrícula → 403 (sem vazar storageRef)', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses)
    const lessonId = course.lessonIds[0]
    const attachment = courses.attachments.find((a) => a.lessonId === lessonId)
    if (!attachment) throw new Error('seed sem anexo')

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}/attachments/${attachment.id}/resolve`,
    )
    expect(res.status).toBe(403)
  })

  test('anexo inexistente → 404 ATTACHMENT_NOT_FOUND', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${course.lessonIds[0]}/attachments/99999999-9999-9999-9999-999999999999/resolve`,
    )
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('ATTACHMENT_NOT_FOUND')
  })

  test('aula rascunho → 404 (anexo invisível mesmo com matrícula)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const attachment = courses.attachments.find((a) => a.lessonId === lessonId)
    if (!attachment) throw new Error('seed sem anexo')
    const lesson = courses.lessons.find((l) => l.id === lessonId)
    if (!lesson) throw new Error('seed sem aula')
    lesson.isPublished = false

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}/attachments/${attachment.id}/resolve`,
    )
    expect(res.status).toBe(404)
  })

  test('anexo de OUTRA aula não resolve (escopo por aula)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const [lessonWithAttachment, otherLesson] = course.lessonIds
    const attachment = courses.attachments.find((a) => a.lessonId === lessonWithAttachment)
    if (!attachment) throw new Error('seed sem anexo')

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${otherLesson}/attachments/${attachment.id}/resolve`,
    )
    expect(res.status).toBe(404)
  })
})
