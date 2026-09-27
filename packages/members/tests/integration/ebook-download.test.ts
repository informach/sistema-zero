import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
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
    expect(ebookBlock.content.attachmentId).toBeUndefined()

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

  test('o livro resolve apenas o PDF selecionado na biblioteca da própria aula', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const ebook = courses.blocks.find((block) => block.id === course.ebookBlockId)
    const pdf = courses.attachments.find((attachment) => attachment.lessonId === lessonId)
    if (!ebook || !pdf) throw new Error('seed sem livro ou PDF')
    ebook.content = { kind: 'ebook', title: 'Guia', attachmentId: pdf.id }

    const path = `/members/courses/${course.slug}/lessons/${lessonId}/blocks/${ebook.id}/ebook/resolve`
    const valid = await get(app, path)
    expect(valid.status).toBe(200)
    expect((await readJson(valid)).storageRef).toBe(pdf.url)

    ebook.content = { kind: 'ebook', title: 'Guia', attachmentId: randomUUID() }
    expect((await get(app, path)).status).toBe(404)

    pdf.fileType = 'image/png'
    ebook.content = { kind: 'ebook', title: 'Guia', attachmentId: pdf.id }
    expect((await get(app, path)).status).toBe(404)
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

  test('bloco inexistente → 423 (a seção barra antes de dizer se existe)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${course.lessonIds[0]}/blocks/99999999-9999-9999-9999-999999999999/ebook/resolve`,
    )
    // ⚠️ Mudou de 404 para 423 com a progressão por seções: um bloco fora da seção
    // acessível é barrado ANTES de o servidor revelar se ele existe (a regra que
    // `legacy-lesson-progression.test.ts` fixa). O teste seguinte, com um bloco REAL de
    // outro kind na seção aberta, continua cobrindo o 404 que não vaza conteúdo.
    expect(res.status).toBe(423)
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
