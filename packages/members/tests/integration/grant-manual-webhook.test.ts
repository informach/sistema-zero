import { describe, expect, test } from 'bun:test'
import { buildApp, offerWithCourse, seedSampleCourse, signedWebhookHeaders } from '../helpers'

const USER = '22222222-2222-2222-2222-222222222222'
const PATH = '/members/webhooks/grant-manual'
const readJson = (res: Response): Promise<any> => res.json()

function post(app: ReturnType<typeof buildApp>['app'], raw: string, deliveryId?: string) {
  return app.handle(
    new Request(`http://localhost${PATH}`, {
      method: 'POST',
      headers: signedWebhookHeaders(PATH, raw, deliveryId),
      body: raw,
    }),
  )
}

describe('POST /members/webhooks/grant-manual (bolsa do referrals)', () => {
  test('concede a oferta completa vitalícia com sourceId auditável + notifica o hub', async () => {
    const { app, courses, catalog, entitlements, hubCalls } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('desafio-primeiro-jogo', offerWithCourse('desafio-primeiro-jogo', course.slug))

    const raw = JSON.stringify({
      userId: USER,
      mode: 'offer',
      offerRef: 'desafio-primeiro-jogo',
      expiresAt: null,
      sourceId: 'scholarship:red-1',
    })
    const res = await post(app, raw, 'gm-1')
    expect(res.status).toBe(200)
    expect(await readJson(res)).toMatchObject({ ok: true, granted: 1 })

    const active = await entitlements.listActiveByUser(USER, new Date())
    expect(active).toHaveLength(1)
    const snap = active[0]!.toSnapshot()
    expect(snap.sourceKind).toBe('manual') // enum INTOCADO
    expect(snap.sourceId).toBe('scholarship:red-1') // procedência auditável
    expect(snap.expiresAt).toBeNull() // vitalícia, como a compra
    expect(hubCalls).toEqual([{ userId: USER, event: 'grant' }])
  })

  test('reentrega do MESMO delivery deduplica; replay é idempotente', async () => {
    const { app, courses, catalog } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('oferta-b', offerWithCourse('oferta-b', course.slug))
    const raw = JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'oferta-b' })

    expect((await post(app, raw, 'gm-2')).status).toBe(200)
    const again = await post(app, raw, 'gm-2')
    expect((await readJson(again)).deduped).toBe(true)

    // Delivery NOVO com o mesmo conteúdo: idempotência do manual:user:product.
    const fresh = await post(app, raw, 'gm-3')
    expect(fresh.status).toBe(200)
    expect((await readJson(fresh)).granted).toBe(1)
  })

  test('sem assinatura HMAC → 401; sem x-delivery-id → 400', async () => {
    const { app } = buildApp()
    const raw = JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'x' })
    const unsigned = await app.handle(
      new Request(`http://localhost${PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: raw,
      }),
    )
    expect(unsigned.status).toBe(401)

    const noDelivery = await post(app, raw) // assinado, sem delivery id
    expect(noDelivery.status).toBe(400)
  })

  test('oferta não resolvida → 502 SEM marcar (retry volta a tentar)', async () => {
    const { app } = buildApp()
    const raw = JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'sem-oferta' })
    const r1 = await post(app, raw, 'gm-4')
    expect(r1.status).toBe(502)
    expect((await readJson(r1)).error).toBe('OFFER_UNRESOLVED')
    // NÃO deduplicou: a mesma entrega re-tenta (e falha de novo, sem sumir).
    const r2 = await post(app, raw, 'gm-4')
    expect(r2.status).toBe(502)
    expect((await readJson(r2)).deduped).toBeUndefined()
  })

  test('matrícula manual revogada do mesmo produto → 409 E MARCA (terminal)', async () => {
    const { app, courses, catalog, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('oferta-c', offerWithCourse('oferta-c', course.slug))
    const raw = JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'oferta-c' })

    expect((await post(app, raw, 'gm-5')).status).toBe(200)
    const [granted] = await entitlements.listActiveByUser(USER, new Date())
    granted!.revoke(new Date())
    expect(await entitlements.update(granted!)).toBe(true) // persiste a revogação

    const conflict = await post(app, raw, 'gm-6')
    expect(conflict.status).toBe(409)
    expect((await readJson(conflict)).error).toBe('ENTITLEMENT_CONFLICT')

    // Terminal: a MESMA entrega agora deduplica (nunca retry infinito).
    const retry = await post(app, raw, 'gm-6')
    expect((await readJson(retry)).deduped).toBe(true)
  })

  test('expiresAt ISO válida vira validade; lixo → 400', async () => {
    const { app, courses, catalog, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('oferta-d', offerWithCourse('oferta-d', course.slug))

    const future = new Date(Date.now() + 30 * 86_400_000).toISOString()
    const ok = await post(
      app,
      JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'oferta-d', expiresAt: future }),
      'gm-7',
    )
    expect(ok.status).toBe(200)
    const [granted] = await entitlements.listActiveByUser(USER, new Date())
    expect(granted!.expiresAt?.toISOString()).toBe(future)

    const bad = await post(
      app,
      JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'oferta-d', expiresAt: 'ontem' }),
      'gm-8',
    )
    expect(bad.status).toBe(400)
  })
})
