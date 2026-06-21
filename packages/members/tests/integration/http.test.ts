import { describe, expect, test } from 'bun:test'
import {
  buildApp,
  grantLifetime,
  offerWithCourse,
  seedSampleCourse,
  signedWebhookHeaders,
} from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = (userId = USER) => ({ 'x-auth-user-id': userId })

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const get = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))

describe('Members HTTP — health/readiness', () => {
  test('/health responde sempre; /readyz segue o probe (503 com banco fora)', async () => {
    const ok = buildApp()
    expect((await ok.app.handle(new Request('http://localhost/health'))).status).toBe(200)
    const ready = await ok.app.handle(new Request('http://localhost/readyz'))
    expect(ready.status).toBe(200)
    expect(await readJson(ready)).toMatchObject({ status: 'ready', checks: { db: 'ok' } })

    const down = buildApp({
      readiness: async () => ({ ready: false, checks: { db: 'error' } }),
    })
    const notReady = await down.app.handle(new Request('http://localhost/readyz'))
    expect(notReady.status).toBe(503)
    expect((await readJson(notReady)).status).toBe('unavailable')
  })
})

describe('Members HTTP — consumo do aluno', () => {
  test('sem identidade (x-auth-user-id) → 401', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/members/courses'))
    expect(res.status).toBe(401)
  })

  test('token interno exigido (prod): ausente/errado → 401; correto → 200', async () => {
    const TOKEN = 'token-interno-gateway-0123456789'
    const { app, courses, entitlements } = buildApp({ internalToken: TOKEN })
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    // Mesmo com identidade válida, sem o token interno (não veio pelo gateway) → 401.
    expect((await get(app, '/members/courses', authHeaders())).status).toBe(401)
    expect(
      (await get(app, '/members/courses', { ...authHeaders(), 'x-internal-token': 'errado' }))
        .status,
    ).toBe(401)
    // Com o token correto (injetado pelo gateway) → 200.
    const ok = await get(app, '/members/courses', {
      ...authHeaders(),
      'x-internal-token': TOKEN,
    })
    expect(ok.status).toBe(200)
  })

  test('aluno com matrícula vê curso, aula (blocos ordenados) e progresso', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const list = await get(app, '/members/courses', authHeaders())
    expect(list.status).toBe(200)
    const listBody = await readJson(list)
    expect(listBody.courses).toHaveLength(1)
    expect(listBody.courses[0].courseSlug).toBe(course.slug)
    expect(listBody.courses[0].progress.percent).toBe(0)

    const detail = await get(app, `/members/courses/${course.slug}`, authHeaders())
    expect(detail.status).toBe(200)
    const detailBody = await readJson(detail)
    expect(detailBody.modules[0].lessons).toHaveLength(2)
    expect(detailBody.modules[0].lessons[0].completed).toBe(false)

    const lessonId = course.lessonIds[0]
    const lesson = await get(
      app,
      `/members/courses/${course.slug}/lessons/${lessonId}`,
      authHeaders(),
    )
    expect(lesson.status).toBe(200)
    const lessonBody = await readJson(lesson)
    expect(lessonBody.blocks.map((b: { kind: string }) => b.kind)).toEqual([
      'rich_text',
      'video',
      'embed',
      'ebook',
    ])
    expect(lessonBody.attachments).toHaveLength(1)
  })

  test('marcar aula concluída atualiza o progresso (idempotente)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]

    const r1 = await app.handle(
      new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    )
    expect(r1.status).toBe(200)
    expect(await readJson(r1)).toMatchObject({ completedLessons: 1, totalLessons: 2, percent: 50 })

    const r2 = await app.handle(
      new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    )
    expect((await readJson(r2)).completedLessons).toBe(1)
  })

  test('curso archived: quem já tem matrícula mantém acesso (draft → 404)', async () => {
    const { app, courses, entitlements } = buildApp()
    const archived = seedSampleCourse(courses, 'arquivado', 'archived')
    grantLifetime(entitlements, { userId: USER, courseRef: archived.slug })

    expect((await get(app, `/members/courses/${archived.slug}`, authHeaders())).status).toBe(200)
    const list = await get(app, '/members/courses', authHeaders())
    expect(
      (await readJson(list)).courses.map((c: { courseSlug: string }) => c.courseSlug),
    ).toContain('arquivado')

    // Curso em rascunho nunca concede acesso, mesmo com matrícula.
    const draft = seedSampleCourse(courses, 'rascunho', 'draft')
    grantLifetime(entitlements, {
      userId: USER,
      courseRef: draft.slug,
      key: 'manual:draft',
    })
    expect((await get(app, `/members/courses/${draft.slug}`, authHeaders())).status).toBe(404)
  })

  test('detalhe escolhe a matrícula mais forte (vitalícia > assinatura)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    // Assinatura com validade futura + vitalícia no MESMO curso.
    grantLifetime(entitlements, {
      userId: USER,
      courseRef: course.slug,
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      subscriptionId: 'sub-1',
      key: 'subscription:sub-1:p',
    })
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug, key: 'manual:lifetime' })

    const detail = await get(app, `/members/courses/${course.slug}`, authHeaders())
    expect((await readJson(detail)).access.expiresAt).toBeNull()
  })

  test('sem matrícula → 403 ACCESS_DENIED, sem vazar blocos', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses)
    const res = await get(
      app,
      `/members/courses/${course.slug}/lessons/${course.lessonIds[0]}`,
      authHeaders('99999999-9999-9999-9999-999999999999'),
    )
    expect(res.status).toBe(403)
    const body = await readJson(res)
    expect(body.error.code).toBe('ACCESS_DENIED')
    expect(body.blocks).toBeUndefined()
  })

  test('x-auth-user-id malformado (não-uuid) → 400 na borda (não 500 por 22P02)', async () => {
    const { app } = buildApp()
    const res = await get(app, '/members/courses', authHeaders('lixo-nao-uuid'))
    expect(res.status).toBe(400)
  })

  test('aula rascunho é invisível ao aluno: some do outline, 404 por URL, progresso conta só publicadas', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    // Despublica a 2ª aula (vira rascunho de autoria).
    const [published, draft] = course.lessonIds
    const draftLesson = courses.lessons.find((l) => l.id === draft)
    if (draftLesson) draftLesson.isPublished = false

    // Outline do aluno só mostra a publicada.
    const detail = await readJson(await get(app, `/members/courses/${course.slug}`, authHeaders()))
    expect(detail.modules[0].lessons.map((l: { id: string }) => l.id)).toEqual([published])

    // Acesso direto por URL → 404 (GET, complete e posição de vídeo).
    expect(
      (await get(app, `/members/courses/${course.slug}/lessons/${draft}`, authHeaders())).status,
    ).toBe(404)
    const complete = await app.handle(
      new Request(`http://localhost/members/lessons/${draft}/complete`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    )
    expect(complete.status).toBe(404)

    // Denominador do progresso = só publicadas: concluir a única publicada → 100%.
    const done = await app.handle(
      new Request(`http://localhost/members/lessons/${published}/complete`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    )
    expect(await readJson(done)).toMatchObject({
      completedLessons: 1,
      totalLessons: 1,
      percent: 100,
    })
    const list = await readJson(await get(app, '/members/courses', authHeaders()))
    expect(list.courses[0].progress.percent).toBe(100)
  })

  test('conclusão de aula DEPOIS despublicada não infla o progresso', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const [l1, l2] = course.lessonIds

    // Conclui SÓ a aula 1 e o admin a despublica em seguida.
    await app.handle(
      new Request(`http://localhost/members/lessons/${l1}/complete`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    )
    const lesson1 = courses.lessons.find((l) => l.id === l1)
    if (lesson1) lesson1.isPublished = false

    // Antes do fix: numerador contava a conclusão da despublicada e o curso
    // aparecia 100% sem o aluno ter feito a única aula visível (l2).
    const progress = await readJson(
      await get(app, `/members/courses/${course.slug}/progress`, authHeaders()),
    )
    expect(progress).toMatchObject({ completedLessons: 0, totalLessons: 1, percent: 0 })

    const detail = await readJson(await get(app, `/members/courses/${course.slug}`, authHeaders()))
    expect(detail.progress.percent).toBe(0)
    const list = await readJson(await get(app, '/members/courses', authHeaders()))
    expect(list.courses[0].progress).toMatchObject({ completedLessons: 0, totalLessons: 1 })

    // Concluir a aula 2 (a única publicada) → 100% de novo, sobre o conjunto visível.
    const done = await readJson(
      await app.handle(
        new Request(`http://localhost/members/lessons/${l2}/complete`, {
          method: 'POST',
          headers: authHeaders(),
        }),
      ),
    )
    expect(done).toMatchObject({ completedLessons: 1, totalLessons: 1, percent: 100 })
  })
})

describe('Members HTTP — webhooks', () => {
  test('grant assinado concede acesso; reentrega (mesmo delivery) deduplica', async () => {
    const { app, courses, catalog, hubCalls } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('offer-x', offerWithCourse('offer-x', course.slug))
    const body = JSON.stringify({ userId: USER, offerRef: 'offer-x', paymentId: 'pay-1' })

    const r1 = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/grant', body, 'd1'),
        body,
      }),
    )
    expect(r1.status).toBe(200)
    expect((await readJson(r1)).granted).toBe(1)

    const list = await get(app, '/members/courses', authHeaders())
    expect((await readJson(list)).courses).toHaveLength(1)

    const r2 = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/grant', body, 'd1'),
        body,
      }),
    )
    expect((await readJson(r2)).deduped).toBe(true)

    // O hub é notificado UMA vez (no grant); a reentrega deduplicada sai antes do notify.
    expect(hubCalls).toEqual([{ userId: USER, event: 'grant' }])
  })

  test('grant de oferta não resolvida → 502 e NÃO deduplica (retry re-tenta)', async () => {
    const { app, processed } = buildApp()
    // Catálogo sem a oferta → grant não resolve.
    const body = JSON.stringify({ userId: USER, offerRef: 'sem-oferta', paymentId: 'pay-1' })
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/grant', body, 'd-unresolved'),
        body,
      }),
    )
    expect(res.status).toBe(502)
    expect((await readJson(res)).error).toBe('OFFER_UNRESOLVED')
    // A entrega NÃO foi marcada → uma reentrega será reprocessada (e não deduplicada).
    expect(await processed.isProcessed('d-unresolved')).toBe(false)
  })

  test('grant de oferta resolvida SEM itens → 502 OFFER_EMPTY e NÃO deduplica', async () => {
    const { app, processed, catalog } = buildApp()
    // Drift de contrato: a oferta existe mas nenhum item sobreviveu ao parse.
    catalog.set('offer-vazia', { offerId: 'o1', offerSlug: 'offer-vazia', items: [] })
    const body = JSON.stringify({ userId: USER, offerRef: 'offer-vazia', paymentId: 'pay-1' })
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/grant', body, 'd-empty'),
        body,
      }),
    )
    expect(res.status).toBe(502)
    expect((await readJson(res)).error).toBe('OFFER_EMPTY')
    // Sem marcar a entrega: a falha repetida na re-entrega é o alarme.
    expect(await processed.isProcessed('d-empty')).toBe(false)
  })

  test('grant com assinatura inválida → 401', async () => {
    const { app } = buildApp()
    const body = JSON.stringify({ userId: USER, offerRef: 'offer-x', paymentId: 'pay-1' })
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': 't=1,v1=deadbeef' },
        body,
      }),
    )
    expect(res.status).toBe(401)
  })

  test('HMAC é checado antes da validação do corpo (corpo inválido + sig inválida → 401)', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        // Corpo que NÃO casa o schema (faltam campos) + assinatura inválida.
        headers: { 'content-type': 'application/json', 'x-signature': 't=1,v1=deadbeef' },
        body: JSON.stringify({ nope: true }),
      }),
    )
    expect(res.status).toBe(401)
  })

  test('cancelamento de assinatura revoga o acesso do aluno', async () => {
    const { app, courses, catalog, hubCalls } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('offer-sub', offerWithCourse('offer-sub', course.slug))

    const grantBody = JSON.stringify({
      userId: USER,
      offerRef: 'offer-sub',
      paymentId: 'pay-1',
      subscription: { subscriptionId: 'sub-1', intervalMonths: 1 },
    })
    await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/grant', grantBody, 'g1'),
        body: grantBody,
      }),
    )
    expect((await get(app, `/members/courses/${course.slug}`, authHeaders())).status).toBe(200)

    const cancelBody = JSON.stringify({ event: 'canceled', subscriptionId: 'sub-1' })
    const cancel = await app.handle(
      new Request('http://localhost/members/webhooks/subscription', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/subscription', cancelBody, 's1'),
        body: cancelBody,
      }),
    )
    expect(cancel.status).toBe(200)
    expect((await readJson(cancel)).affected).toBe(1)

    expect((await get(app, `/members/courses/${course.slug}`, authHeaders())).status).toBe(403)
    expect(hubCalls).toContainEqual({ userId: USER, event: 'canceled' })
  })
})
