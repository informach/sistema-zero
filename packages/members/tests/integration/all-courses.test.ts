import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  buildApp,
  grantAllCourses,
  grantLifetime,
  offerWithAllCourses,
  seedSampleCourse,
  signedWebhookHeaders,
} from '../helpers'

const USER = '44444444-4444-4444-4444-444444444444'
const NOW = new Date('2026-06-02T12:00:00.000Z')

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const authHeaders = (userId = USER) => ({ 'x-auth-user-id': userId })

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

describe('Chave-mestra (all_courses) — acesso', () => {
  test('libera QUALQUER curso publicado, sem matrícula específica', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    seedSampleCourse(courses, 'curso-b')
    grantAllCourses(entitlements, { userId: USER })

    for (const slug of ['curso-a', 'curso-b']) {
      const res = await get(app, `/members/courses/${slug}`, authHeaders())
      expect(res.status).toBe(200)
    }
  })

  test('curso publicado DEPOIS do grant já nasce liberado (atuais e futuros)', async () => {
    const { app, courses, entitlements } = buildApp()
    grantAllCourses(entitlements, { userId: USER, now: new Date('2026-06-01T00:00:00.000Z') })
    // Curso criado depois da concessão — nenhum reprocessamento necessário.
    seedSampleCourse(courses, 'curso-novo')

    const res = await get(app, '/members/courses/curso-novo', authHeaders())
    expect(res.status).toBe(200)
  })

  test('chave-mestra expirada não dá acesso (403); draft continua 404', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    seedSampleCourse(courses, 'rascunho', 'draft')
    grantAllCourses(entitlements, {
      userId: USER,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'), // antes de NOW
      subscriptionId: randomUUID(),
    })

    expect((await get(app, '/members/courses/curso-a', authHeaders())).status).toBe(403)
    // Chave-mestra ATIVA também não vaza curso não publicado.
    grantAllCourses(entitlements, { userId: USER })
    expect((await get(app, '/members/courses/rascunho', authHeaders())).status).toBe(404)
  })
})

describe('Chave-mestra — "meus cursos" e catálogo', () => {
  test('meus cursos lista TODOS os publicados; acesso mais forte por curso', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    seedSampleCourse(courses, 'curso-b')
    // Matrícula específica VITALÍCIA no curso-a + chave-mestra com validade.
    grantLifetime(entitlements, { userId: USER, courseRef: 'curso-a' })
    grantAllCourses(entitlements, {
      userId: USER,
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      subscriptionId: randomUUID(),
    })

    const res = await get(app, '/members/courses', authHeaders())
    expect(res.status).toBe(200)
    const body = await readJson(res)
    const bySlug = new Map(body.courses.map((c: any) => [c.courseSlug, c]))
    expect(bySlug.size).toBe(2)
    // curso-a: vence a vitalícia específica (expiresAt null); curso-b: vem da chave-mestra.
    expect((bySlug.get('curso-a') as any)?.access.expiresAt).toBeNull()
    expect((bySlug.get('curso-b') as any)?.access.expiresAt).toBe('2027-01-01T00:00:00.000Z')
  })

  test('catálogo "Todos os cursos" destrava tudo com a chave-mestra', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    seedSampleCourse(courses, 'curso-b')
    grantAllCourses(entitlements, { userId: USER })

    const res = await get(app, '/members/catalog', authHeaders())
    const body = await readJson(res)
    expect(body.courses).toHaveLength(2)
    for (const c of body.courses) expect(c.hasAccess).toBe(true)
  })
})

describe('Chave-mestra — concessão', () => {
  test('manual (admin): mode all_courses concede; re-conceder é idempotente', async () => {
    const { app } = buildApp()
    const r1 = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'all_courses',
      userId: USER,
    })
    expect(r1.status).toBe(201)
    const b1 = await readJson(r1)
    expect(b1.granted).toHaveLength(1)
    expect(b1.granted[0]).toMatchObject({
      accessType: 'all_courses',
      courseRef: null,
      status: 'active',
    })

    const r2 = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'all_courses',
      userId: USER,
    })
    expect(r2.status).toBe(201)
    expect((await readJson(r2)).granted[0].id).toBe(b1.granted[0].id)
  })

  test('via oferta (webhook de compra): item all_courses materializa a chave-mestra', async () => {
    const { app, courses, catalog, entitlements } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    catalog.set('acesso-total', offerWithAllCourses('acesso-total'))

    const raw = JSON.stringify({
      userId: USER,
      offerRef: 'acesso-total',
      paymentId: 'pay-master-1',
      paidAt: NOW.toISOString(),
    })
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/grant', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/grant', raw, randomUUID()),
        body: raw,
      }),
    )
    expect(res.status).toBe(200)

    const active = await entitlements.listActiveByUser(USER, NOW)
    expect(active).toHaveLength(1)
    expect(active[0]?.accessType).toBe('all_courses')
    // E o acesso funciona de ponta a ponta:
    expect((await get(app, '/members/courses/curso-a', authHeaders())).status).toBe(200)
  })
})
