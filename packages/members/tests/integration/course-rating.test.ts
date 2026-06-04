import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const putRating = (app: App, slug: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/rating`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(body),
    }),
  )
const getRating = (app: App, slug: string) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/rating`, { headers: authHeaders }),
  )
const getCourse = (app: App, slug: string) =>
  app.handle(new Request(`http://localhost/members/courses/${slug}`, { headers: authHeaders }))

describe('Classificação do curso', () => {
  test('PUT só com a nota → 200; meia estrela preservada; detalhe traz myRating', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const res = await putRating(app, course.slug, { rating: 4.5 })
    expect(res.status).toBe(200)
    expect(await readJson(res)).toMatchObject({
      rating: 4.5,
      comment: null,
      feedbackAnswers: null,
    })

    const detail = await readJson(await getCourse(app, course.slug))
    expect(detail.myRating).toMatchObject({ rating: 4.5, comment: null })
  })

  test('upsert acumulado: nota → +comment → +feedback numa linha só; createdAt preservado', async () => {
    const { app, courses, entitlements, ratings, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    await putRating(app, course.slug, { rating: 4 })
    const createdAt = ratings.rows[0]?.createdAt

    clockRef.now = new Date('2026-06-02T13:00:00.000Z')
    await putRating(app, course.slug, { rating: 4, comment: 'Muito bom, mas rápido.' })

    clockRef.now = new Date('2026-06-02T13:05:00.000Z')
    const full = await putRating(app, course.slug, {
      rating: 3.5,
      comment: 'Muito bom, mas rápido.',
      feedbackAnswers: { importantInfo: 'yes', meetsExpectations: 'unsure' },
    })

    expect(full.status).toBe(200)
    expect(await readJson(full)).toMatchObject({
      rating: 3.5,
      comment: 'Muito bom, mas rápido.',
      feedbackAnswers: { importantInfo: 'yes', meetsExpectations: 'unsure' },
    })
    expect(ratings.rows).toHaveLength(1)
    expect(ratings.rows[0]?.createdAt).toEqual(createdAt!)
    expect(ratings.rows[0]?.updatedAt).toEqual(new Date('2026-06-02T13:05:00.000Z'))
    // Armazenamento interno: nota×2 (smallint), sem float.
    expect(ratings.rows[0]?.ratingHalf).toBe(7)
  })

  test('GET rating: null sem registro; estado salvo depois do PUT', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    expect(await readJson(await getRating(app, course.slug))).toEqual({ rating: null })

    await putRating(app, course.slug, { rating: 5, comment: 'Incrível!' })
    const after = await readJson(await getRating(app, course.slug))
    expect(after.rating).toMatchObject({ rating: 5, comment: 'Incrível!' })
  })

  test('sem matrícula → 403 (PUT e GET); curso draft → 404', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    const draft = seedSampleCourse(courses, 'curso-draft', 'draft')
    grantLifetime(entitlements, { userId: USER, courseRef: draft.slug })

    expect((await putRating(app, course.slug, { rating: 4 })).status).toBe(403)
    expect((await getRating(app, course.slug)).status).toBe(403)
    // Draft é invisível mesmo com matrícula (não vaza existência).
    expect((await putRating(app, draft.slug, { rating: 4 })).status).toBe(404)
  })

  test('validação: nota fora dos 9 valores e valor de feedback desconhecido → 400', async () => {
    const { app, courses, entitlements, ratings } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    expect((await putRating(app, course.slug, { rating: 0 })).status).toBe(400)
    expect((await putRating(app, course.slug, { rating: 3.7 })).status).toBe(400)
    expect((await putRating(app, course.slug, { rating: 6 })).status).toBe(400)
    expect((await putRating(app, course.slug, {})).status).toBe(400)
    expect(
      (
        await putRating(app, course.slug, {
          rating: 4,
          feedbackAnswers: { importantInfo: 'maybe' },
        })
      ).status,
    ).toBe(400)
    expect(ratings.rows).toHaveLength(0)
  })

  test('chave desconhecida no feedback é REMOVIDA pelo normalize do Elysia (não persiste)', async () => {
    const { app, courses, entitlements, ratings } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const res = await putRating(app, course.slug, {
      rating: 4,
      feedbackAnswers: { importantInfo: 'yes', hacker: 'yes' },
    })
    expect(res.status).toBe(200)
    expect(ratings.rows[0]?.feedbackAnswers).toEqual({ importantInfo: 'yes' })
  })

  test('detalhe do curso: myRating null sem classificação + salesPageUrl do metadata', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const before = await readJson(await getCourse(app, course.slug))
    expect(before.myRating).toBeNull()
    expect(before.salesPageUrl).toBeNull()

    // metadata.salesPageUrl aparece no detalhe (compartilhar do fluxo de rating).
    const row = courses.courses.find((c) => c.id === course.courseId)
    row!.metadata = { salesPageUrl: 'https://nocomandodaia.com.br/oferta' }
    const after = await readJson(await getCourse(app, course.slug))
    expect(after.salesPageUrl).toBe('https://nocomandodaia.com.br/oferta')
  })

  test('classificações de alunos diferentes não colidem (1 linha por aluno+curso)', async () => {
    const { app, courses, entitlements, ratings } = buildApp()
    const course = seedSampleCourse(courses)
    const OTHER = '22222222-2222-2222-2222-222222222222'
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    grantLifetime(entitlements, { userId: OTHER, courseRef: course.slug })

    await putRating(app, course.slug, { rating: 5 })
    await app.handle(
      new Request(`http://localhost/members/courses/${course.slug}/rating`, {
        method: 'PUT',
        headers: { 'x-auth-user-id': OTHER, 'content-type': 'application/json' },
        body: JSON.stringify({ rating: 2 }),
      }),
    )

    expect(ratings.rows).toHaveLength(2)
    const mine = await readJson(await getCourse(app, course.slug))
    expect(mine.myRating.rating).toBe(5)
  })
})
