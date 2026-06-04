import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const get = (app: App, path: string) =>
  app.handle(new Request(`http://localhost${path}`, { headers: authHeaders }))

describe('Resolução do PDF do bloco e-book (server↔server, BFF do community)', () => {
  test('com matrícula → storageRef + título; o GET da aula NÃO expõe url', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]

    // O GET da aula (member-facing) traz o bloco SEM a localização real.
    const lesson = await get(app, `/members/courses/${course.slug}/lessons/${lessonId}`)
    expect(lesson.status).toBe(200)
    const lessonBody = await readJson(lesson)
    const ebookBlock = lessonBody.blocks.find((b: { kind: string }) => b.kind === 'ebook')
    expect(ebookBlock.id).toBe(course.ebookBlockId)
    expect(ebookBlock.content).toEqual({ kind: 'ebook', title: 'Guia' })
    expect(ebookBlock.content.url).toBeUndefined()

    // A rota de resolução (consumida só pelo servidor do community) traz.
    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}/blocks/${course.ebookBlockId}/ebook/resolve`,
    )
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({
      title: 'Guia',
      storageRef: 'r2priv:admin/attachments/ebook-demo.pdf',
    })
  })

  test('sem matrícula → 403 (sem vazar storageRef)', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses)

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${course.lessonIds[0]}/blocks/${course.ebookBlockId}/ebook/resolve`,
    )
    expect(res.status).toBe(403)
  })

  test('bloco inexistente → 404 EBOOK_BLOCK_NOT_FOUND', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${course.lessonIds[0]}/blocks/99999999-9999-9999-9999-999999999999/ebook/resolve`,
    )
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('EBOOK_BLOCK_NOT_FOUND')
  })

  test('bloco que NÃO é e-book → 404 (não vaza conteúdo de outros kinds)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const videoBlock = courses.blocks.find((b) => b.lessonId === lessonId && b.kind === 'video')
    if (!videoBlock) throw new Error('seed sem bloco de vídeo')

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}/blocks/${videoBlock.id}/ebook/resolve`,
    )
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('EBOOK_BLOCK_NOT_FOUND')
  })

  test('aula rascunho → 404 (e-book invisível mesmo com matrícula)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const lesson = courses.lessons.find((l) => l.id === lessonId)
    if (!lesson) throw new Error('seed sem aula')
    lesson.isPublished = false

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}/blocks/${course.ebookBlockId}/ebook/resolve`,
    )
    expect(res.status).toBe(404)
  })

  test('bloco de OUTRA aula não resolve (escopo por aula)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const otherLesson = course.lessonIds[1]

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${otherLesson}/blocks/${course.ebookBlockId}/ebook/resolve`,
    )
    expect(res.status).toBe(404)
  })
})
