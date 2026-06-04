import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const putPosition = (app: App, slug: string, lessonId: string, positionSeconds: unknown) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/lessons/${lessonId}/position`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ positionSeconds }),
    }),
  )

describe('Posição de vídeo + continuar de onde parou', () => {
  test('PUT posição → 200; GET da aula devolve positionSeconds', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]

    const res = await putPosition(app, course.slug, lessonId, 137)
    expect(res.status).toBe(200)
    expect(await readJson(res)).toMatchObject({ lessonId, positionSeconds: 137 })

    const lesson = await app.handle(
      new Request(`http://localhost/members/courses/${course.slug}/lessons/${lessonId}`, {
        headers: authHeaders,
      }),
    )
    expect((await readJson(lesson)).positionSeconds).toBe(137)
  })

  test('upsert: segundo PUT atualiza a posição (não duplica)', async () => {
    const { app, courses, entitlements, positions } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]

    await putPosition(app, course.slug, lessonId, 10)
    await putPosition(app, course.slug, lessonId, 250)

    expect(positions.rows).toHaveLength(1)
    expect(positions.rows[0]?.positionSeconds).toBe(250)
  })

  test('aula nunca assistida → positionSeconds null no GET', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const lesson = await app.handle(
      new Request(
        `http://localhost/members/courses/${course.slug}/lessons/${course.lessonIds[1]}`,
        { headers: authHeaders },
      ),
    )
    expect((await readJson(lesson)).positionSeconds).toBeNull()
  })

  test('sem matrícula → 403; aula de outro curso → 404; posição inválida → 400', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    const outro = seedSampleCourse(courses, 'outro-curso')
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    // Sem matrícula no curso.
    const semAcesso = await app.handle(
      new Request(
        `http://localhost/members/courses/${outro.slug}/lessons/${outro.lessonIds[0]}/position`,
        { method: 'PUT', headers: authHeaders, body: JSON.stringify({ positionSeconds: 1 }) },
      ),
    )
    expect(semAcesso.status).toBe(403)

    // Aula que não pertence ao curso da URL.
    const aulaErrada = await putPosition(app, course.slug, outro.lessonIds[0], 1)
    expect(aulaErrada.status).toBe(404)

    // Validação do corpo.
    expect((await putPosition(app, course.slug, course.lessonIds[0], -5)).status).toBe(400)
    expect((await putPosition(app, course.slug, course.lessonIds[0], 'abc')).status).toBe(400)
  })

  test('continueLessonId: detalhe prioriza última acessada > primeira não concluída', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const [lesson1, lesson2] = course.lessonIds

    // Sem nada → primeira aula.
    const d1 = await app.handle(
      new Request(`http://localhost/members/courses/${course.slug}`, { headers: authHeaders }),
    )
    expect((await readJson(d1)).continueLessonId).toBe(lesson1)

    // Acessou a aula 2 (posição salva) → continua nela.
    await putPosition(app, course.slug, lesson2, 30)
    const d2 = await app.handle(
      new Request(`http://localhost/members/courses/${course.slug}`, { headers: authHeaders }),
    )
    expect((await readJson(d2)).continueLessonId).toBe(lesson2)

    // Concluiu a aula 2 → cai na primeira não concluída (aula 1).
    clockRef.now = new Date('2026-06-02T13:00:00.000Z')
    await app.handle(
      new Request(`http://localhost/members/lessons/${lesson2}/complete`, {
        method: 'POST',
        headers: authHeaders,
      }),
    )
    const d3 = await app.handle(
      new Request(`http://localhost/members/courses/${course.slug}`, { headers: authHeaders }),
    )
    expect((await readJson(d3)).continueLessonId).toBe(lesson1)
  })

  test('meus cursos: continueLessonId = última aula acessada do curso', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const before = await app.handle(
      new Request('http://localhost/members/courses', { headers: authHeaders }),
    )
    expect((await readJson(before)).courses[0].continueLessonId).toBeNull()

    await putPosition(app, course.slug, course.lessonIds[1], 45)
    const after = await app.handle(
      new Request('http://localhost/members/courses', { headers: authHeaders }),
    )
    expect((await readJson(after)).courses[0].continueLessonId).toBe(course.lessonIds[1])
  })
})
