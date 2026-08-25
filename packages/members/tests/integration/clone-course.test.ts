import { describe, expect, test } from 'bun:test'
import { buildApp, seedSampleCourse } from '../helpers'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const clone = (app: App, courseId: string, body: Record<string, unknown>) =>
  app.handle(
    new Request(`http://localhost/members/admin/courses/${courseId}/clone`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe('clone de curso para a outra plataforma', () => {
  test('árvore inteira copiada; clone nasce draft, fora da carreira, com clonedFrom', async () => {
    const { app, courses } = buildApp()
    const { courseId } = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const src = courses.courses.find((c) => c.id === courseId)
    if (src) src.metadata = { salesPageUrl: 'https://vendas', studioUnlockBlocks: ['sz_g2d_x'] }

    const res = await clone(app, courseId, { audience: 'adult' })
    expect(res.status).toBe(201)
    const view = await readJson(res)
    expect(view.slug).toBe('curso-kids-adulto')
    expect(view.title).toBe('Curso Demo')
    expect(view.status).toBe('draft')
    expect(view.audience).toBe('adult')
    expect(view.careerSlot).toBeNull()
    expect(view.clonedFrom).toBe('curso-kids')
    // Currículo do Estúdio é conceito kids — o clone ADULTO não o carrega.
    expect(view.studioUnlockBlocks).toEqual([])
    // A página de vendas copiada sobrevive no metadata.
    expect(view.salesPageUrl).toBe('https://vendas')

    // Árvore: mesmos números da origem, ids NOVOS, aulas com o mesmo isPublished.
    const srcModules = courses.modules.filter((m) => m.courseId === courseId)
    const cloneModules = courses.modules.filter((m) => m.courseId === view.id)
    expect(cloneModules).toHaveLength(srcModules.length)
    const srcLessons = courses.lessons.filter((l) => l.courseId === courseId)
    const cloneLessons = courses.lessons.filter((l) => l.courseId === view.id)
    expect(cloneLessons).toHaveLength(srcLessons.length)
    expect(cloneLessons.map((l) => l.isPublished).sort()).toEqual(
      srcLessons.map((l) => l.isPublished).sort(),
    )
    const srcLessonIds = new Set(srcLessons.map((l) => l.id))
    const cloneLessonIds = new Set(cloneLessons.map((l) => l.id))
    const srcBlocks = courses.blocks.filter((b) => srcLessonIds.has(b.lessonId))
    const cloneBlocks = courses.blocks.filter((b) => cloneLessonIds.has(b.lessonId))
    expect(cloneBlocks).toHaveLength(srcBlocks.length)
    expect(cloneBlocks.map((b) => b.kind).sort()).toEqual(srcBlocks.map((b) => b.kind).sort())
    const srcAttachments = courses.attachments.filter((a) => srcLessonIds.has(a.lessonId))
    const cloneAttachments = courses.attachments.filter((a) => cloneLessonIds.has(a.lessonId))
    expect(cloneAttachments).toHaveLength(srcAttachments.length)
    // O anexo aponta o MESMO storageRef (objetos do R2 nunca somem por cascade).
    expect(cloneAttachments.map((a) => a.url).sort()).toEqual(
      srcAttachments.map((a) => a.url).sort(),
    )
  })

  test('clone adulto→kids mantém o studioUnlockBlocks; slug/título custom valem', async () => {
    const { app, courses } = buildApp()
    const { courseId } = seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')
    const src = courses.courses.find((c) => c.id === courseId)
    if (src) src.metadata = { studioUnlockBlocks: ['sz_g2d_x'] }

    const res = await clone(app, courseId, {
      audience: 'kids',
      slug: 'versao-kids',
      title: 'Versão Kids',
    })
    expect(res.status).toBe(201)
    const view = await readJson(res)
    expect(view.slug).toBe('versao-kids')
    expect(view.title).toBe('Versão Kids')
    expect(view.audience).toBe('kids')
    expect(view.studioUnlockBlocks).toEqual(['sz_g2d_x'])
  })

  test('slug em uso → 409; curso inexistente → 404', async () => {
    const { app, courses } = buildApp()
    const { courseId } = seedSampleCourse(courses, 'curso-um', 'published', 'kids')
    seedSampleCourse(courses, 'curso-um-adulto', 'published', 'adult')
    expect((await clone(app, courseId, { audience: 'adult' })).status).toBe(409)
    expect(
      (await clone(app, 'f0000000-0000-4000-8000-000000000000', { audience: 'adult' })).status,
    ).toBe(404)
  })

  test('recusa clone para a mesma plataforma sem criar uma segunda árvore', async () => {
    const { app, courses } = buildApp()
    const { courseId } = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const before = courses.courses.length

    const res = await clone(app, courseId, { audience: 'kids' })

    expect(res.status).toBe(409)
    expect(await readJson(res)).toEqual({
      error: {
        code: 'CLONE_SAME_AUDIENCE',
        message: 'O curso só pode ser clonado para a outra plataforma',
      },
    })
    expect(courses.courses).toHaveLength(before)
  })

  test('recusa clone quando a origem muda entre a leitura e a transação', async () => {
    const { app, courses } = buildApp()
    const { courseId } = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const originalFind = courses.findCourseById.bind(courses)
    courses.findCourseById = async (id) => {
      const found = await originalFind(id)
      if (!found) return null
      const snapshot = { ...found }
      found.title = 'Título concorrente'
      found.version += 1
      return snapshot
    }

    const res = await clone(app, courseId, { audience: 'adult' })

    expect(res.status).toBe(409)
    expect(await readJson(res)).toEqual({
      error: {
        code: 'CONCURRENCY_CONFLICT',
        message: 'Curso alterado por outra operação',
      },
    })
    expect(
      courses.courses.filter((course) => course.metadata?.clonedFrom === 'curso-kids'),
    ).toEqual([])
  })
})
