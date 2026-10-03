import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * "Assistir ao vídeo antes da atividade" (03/10/2026): opção por curso, desligada por padrão.
 * O members guarda e entrega; quem tranca a atividade é o player (guia de interface).
 */
type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const STUDENT = '55555555-5555-5555-5555-555555555555'
const student = { 'x-auth-user-id': STUDENT, 'x-auth-user-name': 'Ana' }
const staff = { ...student, 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (app: App, path: string, method: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

const COURSE = {
  slug: 'curso-video-primeiro',
  title: 'Curso',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  status: 'draft',
}

async function patchCourse(app: App, id: string, body: Record<string, unknown>) {
  const current = await readJson(await get(app, `/members/admin/courses/${id}`))
  return send(app, `/members/admin/courses/${id}`, 'PATCH', {
    ...COURSE,
    ...body,
    version: current.version,
  })
}

describe('Vídeo antes da atividade — a opção do curso', () => {
  test('nasce desligada quando o admin não manda o campo', async () => {
    const { app } = buildApp()
    const created = await readJson(await send(app, '/members/admin/courses', 'POST', COURSE))
    expect(created.videoBeforeActivity).toBe(false)
  })

  test('liga no create e o PATCH sem o campo PRESERVA (build antigo do admin)', async () => {
    const { app } = buildApp()
    const created = await readJson(
      await send(app, '/members/admin/courses', 'POST', { ...COURSE, videoBeforeActivity: true }),
    )
    expect(created.videoBeforeActivity).toBe(true)

    const kept = await readJson(await patchCourse(app, created.id, { title: 'Outro nome' }))
    expect(kept.videoBeforeActivity).toBe(true)

    const off = await readJson(await patchCourse(app, created.id, { videoBeforeActivity: false }))
    expect(off.videoBeforeActivity).toBe(false)
  })

  test('o clone para a outra plataforma leva a opção junto', async () => {
    const { app } = buildApp()
    const created = await readJson(
      await send(app, '/members/admin/courses', 'POST', {
        ...COURSE,
        audience: 'adult',
        videoBeforeActivity: true,
      }),
    )
    const res = await send(app, `/members/admin/courses/${created.id}/clone`, 'POST', {
      audience: 'kids',
    })
    expect(res.status).toBe(201)
    expect((await readJson(res)).videoBeforeActivity).toBe(true)
  })
})

describe('Vídeo antes da atividade — o que chega à aula', () => {
  function lessonWithFlag(flag: boolean) {
    const built = buildApp()
    const seeded = seedSampleCourse(built.courses, 'curso-guiado', 'published', 'kids')
    const course = built.courses.courses.find((c) => c.slug === seeded.slug)
    if (!course) throw new Error('curso semeado não encontrado')
    course.videoBeforeActivity = flag
    grantLifetime(built.entitlements, { userId: STUDENT, courseRef: seeded.slug })
    return { ...built, ...seeded }
  }

  test('o aluno recebe a opção ligada', async () => {
    const {
      app,
      slug,
      lessonIds: [lesson1],
    } = lessonWithFlag(true)
    const res = await get(app, `/members/courses/${slug}/lessons/${lesson1}`, student)
    expect(res.status).toBe(200)
    expect((await readJson(res)).videoBeforeActivity).toBe(true)
  })

  test('a equipe nunca vê a trava', async () => {
    const {
      app,
      slug,
      lessonIds: [lesson1],
    } = lessonWithFlag(true)
    const res = await get(app, `/members/courses/${slug}/lessons/${lesson1}`, staff)
    expect(res.status).toBe(200)
    expect((await readJson(res)).videoBeforeActivity).toBe(false)
  })

  test('curso com a opção desligada entrega false', async () => {
    const {
      app,
      slug,
      lessonIds: [lesson1],
    } = lessonWithFlag(false)
    const res = await get(app, `/members/courses/${slug}/lessons/${lesson1}`, student)
    expect((await readJson(res)).videoBeforeActivity).toBe(false)
  })
})
