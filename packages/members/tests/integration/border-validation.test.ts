import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse, signedWebhookHeaders } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER }
const jsonHeaders = { ...authHeaders, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const get = (app: App, path: string) =>
  app.handle(new Request(`http://localhost${path}`, { headers: authHeaders }))
const send = (app: App, method: string, path: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }),
  )

describe('Validação de borda — ids uuid nos params (id lixo → 400, nunca 22P02→500)', () => {
  test('rotas do aluno com :lessonId/:blockId não-uuid → 400', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    expect((await get(app, `/members/courses/${course.slug}/lessons/abc`)).status).toBe(400)
    expect(
      (await get(app, `/members/courses/${course.slug}/lessons/abc/attachments/def/resolve`))
        .status,
    ).toBe(400)
    expect(
      (
        await get(
          app,
          `/members/courses/${course.slug}/lessons/${course.lessonIds[0]}/blocks/zzz/ebook/resolve`,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await app.handle(
          new Request('http://localhost/members/lessons/nao-uuid/complete', {
            method: 'POST',
            headers: authHeaders,
          }),
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await send(app, 'PUT', `/members/courses/${course.slug}/lessons/123/position`, {
          positionSeconds: 10,
        })
      ).status,
    ).toBe(400)
  })

  test('rotas admin com :userId/:id não-uuid → 400', async () => {
    const { app } = buildApp()
    expect((await get(app, '/members/admin/members/nao-uuid')).status).toBe(400)
    expect(
      (await send(app, 'PATCH', '/members/admin/entitlements/abc', { action: 'revoke' })).status,
    ).toBe(400)
    expect((await get(app, '/members/admin/courses/abc')).status).toBe(400)
    expect(
      (await send(app, 'PATCH', '/members/admin/lessons/xyz', { slug: 'a', title: 'A' })).status,
    ).toBe(400)
  })
})

describe('Validação de borda — URLs do admin exigem http(s) (XSS via javascript: barrado)', () => {
  test('salesPageUrl/coverImageUrl com esquema perigoso → 400; https → 201; null limpa', async () => {
    const { app } = buildApp()
    const base = { slug: 'curso-x', title: 'Curso X', status: 'draft' }

    const bad = await send(app, 'POST', '/members/admin/courses', {
      ...base,
      salesPageUrl: 'javascript:alert(1)',
    })
    expect(bad.status).toBe(400)

    const badCover = await send(app, 'POST', '/members/admin/courses', {
      ...base,
      coverImageUrl: 'data:text/html,<script>1</script>',
    })
    expect(badCover.status).toBe(400)

    const ok = await send(app, 'POST', '/members/admin/courses', {
      ...base,
      salesPageUrl: 'https://sistemazero.com.br/oferta',
      coverImageUrl: null,
    })
    expect(ok.status).toBe(201)
  })

  test('bloco image/ebook e anexo validam o esquema da referência', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses)
    const lessonId = course.lessonIds[0]

    const badImage = await send(app, 'POST', `/members/admin/lessons/${lessonId}/blocks`, {
      content: { kind: 'image', url: 'javascript:alert(1)' },
    })
    expect(badImage.status).toBe(400)

    // `r2priv:<key>` é o caminho padrão do ebook/anexo; http(s) externo segue aceito.
    const okEbook = await send(app, 'POST', `/members/admin/lessons/${lessonId}/blocks`, {
      content: { kind: 'ebook', url: 'r2priv:admin/attachments/livro.pdf' },
    })
    expect(okEbook.status).toBe(201)

    const badAttachment = await send(
      app,
      'POST',
      `/members/admin/lessons/${lessonId}/attachments`,
      {
        label: 'Material',
        url: 'ftp://servidor/arquivo.zip',
      },
    )
    expect(badAttachment.status).toBe(400)
  })
})

describe('Validação de borda — webhooks', () => {
  test('x-delivery-id acima do teto → 400 sem processar', async () => {
    const { app, processed } = buildApp()
    const path = '/members/webhooks/grant'
    const body = JSON.stringify({ userId: USER, offerRef: 'oferta', paymentId: 'pay_1' })
    const res = await app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        body,
        headers: signedWebhookHeaders(path, body, 'x'.repeat(300)),
      }),
    )
    expect(res.status).toBe(400)
    expect(processed.seen.size).toBe(0)
  })

  test('grant com userId não-uuid → 400 (formato validado na borda)', async () => {
    const { app } = buildApp()
    const path = '/members/webhooks/grant'
    const body = JSON.stringify({ userId: 'nao-uuid', offerRef: 'oferta', paymentId: 'pay_1' })
    const res = await app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        body,
        headers: signedWebhookHeaders(path, body, 'd-1'),
      }),
    )
    expect(res.status).toBe(400)
  })
})
