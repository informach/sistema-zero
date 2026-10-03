import { describe, expect, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import {
  buildApp,
  offerWithCourse,
  seedSampleCourse,
  signedWebhookHeaders,
  WEBHOOK_SECRET,
} from '../helpers'

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

function getGiftAvailability(app: ReturnType<typeof buildApp>['app'], slug: string, signed = true) {
  const path = `/members/webhooks/gift-course/${slug}`
  const ts = Math.floor(Date.now() / 1000)
  const signature = signHmac(
    WEBHOOK_SECRET,
    canonicalHmacMessage({ method: 'GET', path, body: '' }),
    ts,
  )
  return app.handle(
    new Request(`http://localhost${path}`, {
      headers: signed ? { 'x-signature': `t=${ts},v1=${signature}` } : {},
    }),
  )
}

describe('POST /members/webhooks/grant-manual (bolsa do referrals)', () => {
  test('Mural de sete dias recusa curso da mesma origem com prazo maior que sete dias', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const base = {
      userId: USER,
      sourceId: 'scholarship:too-long',
      courseRef: 'cade-todo-mundo',
      expiresAt: new Date(clockRef.now.getTime() + 30 * 86_400_000).toISOString(),
    }
    expect(
      (await post(app, JSON.stringify({ ...base, mode: 'course' }), 'long-course')).status,
    ).toBe(200)
    expect(
      (await post(app, JSON.stringify({ ...base, mode: 'mural_trial' }), 'long-mural')).status,
    ).toBe(409)
    expect(await entitlements.listByUserId(USER)).toHaveLength(1)
  })

  test('Mural do presente acompanha o prazo do curso e conserva a visita após vencer', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const expiresAt = new Date(clockRef.now.getTime() + 7 * 86_400_000)
    const origin = {
      userId: USER,
      sourceId: 'scholarship:trial-1',
      courseRef: 'cade-todo-mundo',
      expiresAt: expiresAt.toISOString(),
    }
    expect(
      (await post(app, JSON.stringify({ ...origin, mode: 'course' }), 'trial-course')).status,
    ).toBe(200)
    const raw = JSON.stringify({ ...origin, mode: 'mural_trial' })
    expect((await post(app, raw, 'trial-mural')).status).toBe(200)
    expect((await post(app, raw, 'trial-mural-retry')).status).toBe(200)
    const during = await entitlements.listActiveByUser(USER, new Date(expiresAt.getTime() - 1))
    expect(during.map((e) => e.toSnapshot().courseRef).sort()).toEqual([
      'cade-todo-mundo',
      'mural-dos-criadores',
      'mural-dos-criadores-visitante',
    ])
    expect(
      during.find((e) => e.toSnapshot().courseRef === 'mural-dos-criadores')?.expiresAt,
    ).toEqual(expiresAt)
    const after = await entitlements.listActiveByUser(USER, expiresAt)
    expect(after.map((e) => e.toSnapshot().courseRef)).toEqual(['mural-dos-criadores-visitante'])
    expect(after[0]?.expiresAt).toBeNull()
    expect(await entitlements.listByUserId(USER)).toHaveLength(3)
    const trial = during.find((e) => e.toSnapshot().courseRef === 'mural-dos-criadores')!
    const paid = EntitlementAggregate.grant({
      ...trial.toSnapshot(),
      id: crypto.randomUUID(),
      sourceKind: 'payment',
      sourceId: 'independent-payment',
      idempotencyKey: 'independent-payment:mural',
      expiresAt: null,
      snapshot: {
        ...trial.snapshot,
        accessPolicy: { mode: 'lifetime', durationValue: null, durationUnit: null },
      },
    })
    await entitlements.save(paid)
    // O vencimento do presente não retira um acesso adquirido por outra origem.
    expect(
      (await entitlements.listActiveByUser(USER, expiresAt))
        .map((e) => e.toSnapshot().courseRef)
        .sort(),
    ).toEqual(['mural-dos-criadores', 'mural-dos-criadores-visitante'])
  })

  test('Mural temporário exige prazo e matrícula do curso da mesma origem', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const expiresAt = new Date(clockRef.now.getTime() + 7 * 86_400_000).toISOString()
    const base = {
      userId: USER,
      sourceId: 'scholarship:trial-2',
      courseRef: 'cade-todo-mundo',
      expiresAt,
    }
    const raw = JSON.stringify({ ...base, mode: 'mural_trial' })
    expect((await post(app, raw, 'trial-missing')).status).toBe(409)
    expect(await entitlements.listByUserId(USER)).toHaveLength(0)
    expect(
      (await post(app, JSON.stringify({ ...base, mode: 'course' }), 'trial-existing')).status,
    ).toBe(200)
    for (const override of [
      { sourceId: 'scholarship:another' },
      { expiresAt: new Date(Date.now() + 8 * 86_400_000).toISOString() },
    ]) {
      expect(
        (
          await post(
            app,
            JSON.stringify({ ...base, mode: 'mural_trial', ...override }),
            'trial-invalid-origin',
          )
        ).status,
      ).toBe(409)
    }
    for (const override of [
      { expiresAt: null },
      { expiresAt: undefined },
      { sourceId: 'manual:other' },
    ]) {
      expect(
        (
          await post(
            app,
            JSON.stringify({ ...base, mode: 'mural_trial', ...override }),
            'trial-invalid-body',
          )
        ).status,
      ).toBe(400)
    }
    // Falha não consome a entrega; retomar agora concede ambos os direitos.
    expect((await post(app, raw, 'trial-missing')).status).toBe(200)
    expect(await entitlements.listByUserId(USER)).toHaveLength(3)
  })

  test('Mural temporário recusa matrícula revogada ou vencida sem reativar o curso', async () => {
    for (const state of ['revoked', 'expired']) {
      const { app, courses, entitlements, clockRef } = buildApp()
      seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
      const expiresAt = new Date(clockRef.now.getTime() + 7 * 86_400_000)
      const base = {
        userId: USER,
        sourceId: `scholarship:trial-${state}`,
        courseRef: 'cade-todo-mundo',
        expiresAt: expiresAt.toISOString(),
      }
      expect(
        (await post(app, JSON.stringify({ ...base, mode: 'course' }), `course-${state}`)).status,
      ).toBe(200)
      if (state === 'revoked') {
        const enrollment = (await entitlements.listByUserId(USER))[0]!
        enrollment.revoke(clockRef.now)
        await entitlements.update(enrollment)
      } else {
        clockRef.now = expiresAt
      }
      expect(
        (await post(app, JSON.stringify({ ...base, mode: 'mural_trial' }), `mural-${state}`))
          .status,
      ).toBe(409)
      expect(await entitlements.listByUserId(USER)).toHaveLength(1)
    }
  })

  test('falha ao salvar o lote não deixa participação sem visita; retry completa sem duplicar', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const base = {
      userId: USER,
      sourceId: 'scholarship:trial-atomic',
      courseRef: 'cade-todo-mundo',
      expiresAt: new Date(clockRef.now.getTime() + 7 * 86_400_000).toISOString(),
    }
    expect(
      (await post(app, JSON.stringify({ ...base, mode: 'course' }), 'course-atomic')).status,
    ).toBe(200)
    const saveMany = entitlements.saveMany.bind(entitlements)
    entitlements.saveMany = async () => false
    const raw = JSON.stringify({ ...base, mode: 'mural_trial' })
    expect((await post(app, raw, 'mural-atomic')).status).toBe(502)
    expect(await entitlements.listByUserId(USER)).toHaveLength(1)
    entitlements.saveMany = saveMany
    expect((await post(app, raw, 'mural-atomic')).status).toBe(200)
    expect(await entitlements.listByUserId(USER)).toHaveLength(3)
  })

  test('consulta assinada só libera curso kids publicado', async () => {
    const { app, courses } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    seedSampleCourse(courses, 'curso-rascunho', 'draft', 'kids')
    seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')

    expect(await readJson(await getGiftAvailability(app, 'cade-todo-mundo'))).toEqual({
      available: true,
    })
    for (const slug of ['curso-rascunho', 'curso-adulto', 'curso-ausente']) {
      const res = await getGiftAvailability(app, slug)
      expect(res.status).toBe(200)
      expect(await readJson(res)).toEqual({ available: false })
    }
    expect((await getGiftAvailability(app, 'cade-todo-mundo', false)).status).toBe(401)
  })

  test('concede somente o curso kids publicado sem oferta e com procedência auditável', async () => {
    const { app, courses, entitlements, hubCalls } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const raw = JSON.stringify({
      userId: USER,
      mode: 'course',
      courseRef: 'cade-todo-mundo',
      expiresAt: null,
      sourceId: 'scholarship:red-1',
    })

    const res = await post(app, raw, 'course-1')
    expect(res.status).toBe(200)
    expect(await readJson(res)).toMatchObject({ ok: true, granted: 1 })
    const active = await entitlements.listActiveByUser(USER, new Date())
    expect(active).toHaveLength(1)
    expect(active[0]!.toSnapshot()).toMatchObject({
      courseRef: 'cade-todo-mundo',
      offerId: null,
      sourceId: 'scholarship:red-1',
      expiresAt: null,
    })
    expect(hubCalls).toEqual([{ userId: USER, event: 'grant' }])
  })

  test('curso-presente vence exatamente em expiresAt sem afetar outra concessão', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const raw = JSON.stringify({
      userId: USER,
      mode: 'course',
      courseRef: 'cade-todo-mundo',
      expiresAt: expiresAt.toISOString(),
      sourceId: 'scholarship:red-7d',
    })

    expect((await post(app, raw, 'course-7d')).status).toBe(200)
    expect(
      await entitlements.listActiveByUser(USER, new Date(expiresAt.getTime() - 1)),
    ).toHaveLength(1)
    expect(await entitlements.listActiveByUser(USER, expiresAt)).toHaveLength(0)

    const independent = JSON.stringify({
      userId: USER,
      mode: 'course',
      courseRef: 'cade-todo-mundo',
      expiresAt: null,
      sourceId: 'manual:other-campaign',
    })
    expect((await post(app, independent, 'course-other')).status).toBe(200)
    const active = await entitlements.listActiveByUser(USER, expiresAt)
    expect(active).toHaveLength(1)
    expect(active[0]!.toSnapshot().sourceId).toBe('manual:other-campaign')
  })

  test('visita ao Mural é permanente, distinta do curso e idempotente', async () => {
    const { app, courses, entitlements, hubCalls } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')
    const expiresAt = new Date(Date.now() + 7 * 86_400_000)
    const course = JSON.stringify({
      userId: USER,
      mode: 'course',
      courseRef: 'cade-todo-mundo',
      expiresAt: expiresAt.toISOString(),
      sourceId: 'scholarship:red-visitor',
    })
    const visitor = JSON.stringify({
      userId: USER,
      mode: 'mural_visitor',
      sourceId: 'scholarship:red-visitor',
    })

    expect((await post(app, course, 'course-visitor')).status).toBe(200)
    expect((await post(app, visitor, 'mural-visitor')).status).toBe(200)
    expect((await readJson(await post(app, visitor, 'mural-visitor'))).deduped).toBe(true)
    expect((await post(app, visitor, 'mural-visitor-retry')).status).toBe(200)

    const active = await entitlements.listActiveByUser(USER, expiresAt)
    expect(active).toHaveLength(1)
    expect(active[0]!.toSnapshot()).toMatchObject({
      accessType: 'community',
      courseRef: 'mural-dos-criadores-visitante',
      sourceId: 'scholarship:red-visitor',
      expiresAt: null,
    })
    expect(hubCalls).toHaveLength(3)
  })

  test('curso ainda em rascunho recusa o grant sem marcar a entrega', async () => {
    const { app, courses, entitlements, hubCalls } = buildApp()
    seedSampleCourse(courses, 'cade-todo-mundo', 'draft', 'kids')
    const raw = JSON.stringify({ userId: USER, mode: 'course', courseRef: 'cade-todo-mundo' })

    const first = await post(app, raw, 'course-draft')
    expect(first.status).toBe(503)
    expect(await readJson(first)).toMatchObject({ ok: false, error: 'COURSE_UNAVAILABLE' })
    const second = await post(app, raw, 'course-draft')
    expect(second.status).toBe(503)
    expect((await readJson(second)).deduped).toBeUndefined()
    expect(await entitlements.listActiveByUser(USER, new Date())).toHaveLength(0)
    expect(hubCalls).toHaveLength(0)
  })

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

  test('matrícula manual revogada do mesmo produto → 409 SEM marcar (destravável)', async () => {
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

    // NÃO marcou: a mesma entrega repete o 409 (o chamador é quem o trata como
    // terminal). Marcar aqui seria pior: um retry pós-conserto deduparia com
    // `ok:true` SEM conceder nada — sucesso falso para o chamador.
    const retry = await post(app, raw, 'gm-6')
    expect(retry.status).toBe(409)
    expect((await readJson(retry)).deduped).toBeUndefined()

    // Operador destrava (reativa via estender) → a MESMA entrega agora conclui.
    // Recarrega ANTES de mutar: o update é otimista por `version` e a instância
    // local ficou para trás depois do primeiro update.
    const reloaded = await entitlements.findById(granted!.id)
    reloaded!.reactivate(null, new Date())
    expect(await entitlements.update(reloaded!)).toBe(true)
    const healed = await post(app, raw, 'gm-6')
    expect(healed.status).toBe(200)
    expect((await readJson(healed)).granted).toBe(1)
  })

  test('sourceId próprio NÃO colide com cortesia admin do mesmo produto', async () => {
    const { app, courses, catalog, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    catalog.set('oferta-e', offerWithCourse('oferta-e', course.slug))

    // Cortesia admin (sem sourceId) já existe e foi REVOGADA…
    const cortesia = JSON.stringify({ userId: USER, mode: 'offer', offerRef: 'oferta-e' })
    expect((await post(app, cortesia, 'gm-9')).status).toBe(200)
    const [existing] = await entitlements.listActiveByUser(USER, new Date())
    existing!.revoke(new Date())
    expect(await entitlements.update(existing!)).toBe(true)

    // …e a BOLSA do mesmo produto ainda concede (chave própria por sourceId).
    const bolsa = JSON.stringify({
      userId: USER,
      mode: 'offer',
      offerRef: 'oferta-e',
      sourceId: 'scholarship:red-9',
    })
    const res = await post(app, bolsa, 'gm-10')
    expect(res.status).toBe(200)
    expect((await readJson(res)).granted).toBe(1)
    const active = await entitlements.listActiveByUser(USER, new Date())
    expect(active).toHaveLength(1)
    expect(active[0]!.toSnapshot().sourceId).toBe('scholarship:red-9')
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
