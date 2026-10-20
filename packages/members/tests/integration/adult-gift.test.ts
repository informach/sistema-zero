import { describe, expect, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import { buildApp, seedSampleCourse, signedWebhookHeaders, WEBHOOK_SECRET } from '../helpers'

/**
 * Presente ADULTO (20/10/2026): `audience: 'adult'` no `gift-course` e no `grant-manual`. Mesmo
 * contrato e mesmas recusas do Kids; muda o público exigido do curso e as chaves do Mural.
 */
const USER = '33333333-3333-3333-3333-333333333333'
const PATH = '/members/webhooks/grant-manual'
const TOKEN = 'internal-token-16-chars!!'
const DAY = 86_400_000
const readJson = (res: Response): Promise<any> => res.json()

type App = ReturnType<typeof buildApp>['app']

function post(app: App, body: Record<string, unknown>, deliveryId: string) {
  const raw = JSON.stringify(body)
  return app.handle(
    new Request(`http://localhost${PATH}`, {
      method: 'POST',
      headers: signedWebhookHeaders(PATH, raw, deliveryId),
      body: raw,
    }),
  )
}

function giftAvailability(app: App, slug: string, query = '') {
  const path = `/members/webhooks/gift-course/${slug}`
  const ts = Math.floor(Date.now() / 1000)
  // O HMAC assina o path SEM a query (mesma régua do gateway).
  const signature = signHmac(
    WEBHOOK_SECRET,
    canonicalHmacMessage({ method: 'GET', path, body: '' }),
    ts,
  )
  return app.handle(
    new Request(`http://localhost${path}${query}`, {
      headers: { 'x-signature': `t=${ts},v1=${signature}` },
    }),
  )
}

function setup() {
  const ctx = buildApp({ internalToken: TOKEN })
  seedSampleCourse(ctx.courses, 'cade-todo-mundo', 'published', 'kids')
  seedSampleCourse(ctx.courses, 'cade-todo-mundo-adulto', 'published', 'adult')
  const expiresAt = new Date(ctx.clockRef.now.getTime() + 7 * DAY)
  const adult = {
    userId: USER,
    sourceId: 'scholarship:adult-1',
    courseRef: 'cade-todo-mundo-adulto',
    expiresAt: expiresAt.toISOString(),
    audience: 'adult',
  }
  return { ...ctx, expiresAt, adult }
}

async function communities(app: App, userId: string) {
  const res = await app.handle(
    new Request('http://local/members/internal/access-check', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': TOKEN },
      body: JSON.stringify({ userId, courseRefs: [] }),
    }),
  )
  return ((await res.json()) as { communities: string[] }).communities.sort()
}

describe('presente adulto: disponibilidade do curso', () => {
  test('audience=adult libera só curso adulto publicado e gravado; ausente segue Kids', async () => {
    const { app, courses } = setup()
    seedSampleCourse(courses, 'adulto-rascunho', 'draft', 'adult')
    const live = seedSampleCourse(courses, 'adulto-ao-vivo', 'published', 'adult')
    const liveCourse = courses.courses.find((c) => c.id === live.courseId)
    if (liveCourse) liveCourse.modality = 'live'

    const available = async (slug: string, query = '') =>
      (await readJson(await giftAvailability(app, slug, query))).available
    expect(await available('cade-todo-mundo-adulto', '?audience=adult')).toBe(true)
    expect(await available('cade-todo-mundo', '?audience=adult')).toBe(false)
    expect(await available('adulto-rascunho', '?audience=adult')).toBe(false)
    expect(await available('adulto-ao-vivo', '?audience=adult')).toBe(false)
    // Contrato anterior intacto: sem query, só o Kids.
    expect(await available('cade-todo-mundo')).toBe(true)
    expect(await available('cade-todo-mundo-adulto')).toBe(false)
    expect(await available('cade-todo-mundo', '?audience=kids')).toBe(true)
    expect((await giftAvailability(app, 'cade-todo-mundo', '?audience=pro')).status).toBe(400)
  })
})

describe('presente adulto: grant-manual', () => {
  test('curso adulto exige audience adult; o público do presente fica no snapshot', async () => {
    const { app, entitlements, adult } = setup()
    const { audience: _audience, ...withoutAudience } = adult
    // Sem audience é o contrato Kids: o curso adulto não serve.
    const kidsDefault = await post(app, { ...withoutAudience, mode: 'course' }, 'adult-default')
    expect(kidsDefault.status).toBe(503)
    expect(await readJson(kidsDefault)).toMatchObject({ error: 'COURSE_UNAVAILABLE' })
    // Curso Kids com audience adult também não serve.
    expect(
      (
        await post(
          app,
          { ...adult, courseRef: 'cade-todo-mundo', mode: 'course' },
          'adult-kids-course',
        )
      ).status,
    ).toBe(503)
    expect(await entitlements.listByUserId(USER)).toHaveLength(0)

    const ok = await post(app, { ...adult, mode: 'course' }, 'adult-course')
    expect(ok.status).toBe(200)
    expect(await readJson(ok)).toEqual({ ok: true, granted: 1 })
    const [course] = await entitlements.listByUserId(USER)
    expect(course?.toSnapshot()).toMatchObject({
      courseRef: 'cade-todo-mundo-adulto',
      sourceKind: 'manual',
      sourceId: 'scholarship:adult-1',
    })
    expect(course?.snapshot.giftAudience).toBe('adult')
  })

  test('Mural adulto do presente: pleno até o vencimento, visita adulta permanente, idempotente', async () => {
    const { app, entitlements, expiresAt, adult, hubCalls } = setup()
    expect((await post(app, { ...adult, mode: 'course' }, 'c-1')).status).toBe(200)
    const trial = { ...adult, mode: 'mural_trial' }
    const first = await post(app, trial, 'm-1')
    expect(first.status).toBe(200)
    expect(await readJson(first)).toEqual({ ok: true, granted: 2 })
    expect((await post(app, trial, 'm-1-retry')).status).toBe(200)
    expect(await entitlements.listByUserId(USER)).toHaveLength(3)

    const during = await entitlements.listActiveByUser(USER, new Date(expiresAt.getTime() - 1))
    expect(during.map((e) => e.toSnapshot().courseRef).sort()).toEqual([
      'adult-mural-dos-criadores',
      'adult-mural-dos-criadores-visitante',
      'cade-todo-mundo-adulto',
    ])
    const full = during.find((e) => e.toSnapshot().courseRef === 'adult-mural-dos-criadores')
    expect(full?.expiresAt).toEqual(expiresAt)
    expect(full?.toSnapshot().productId).toBe('00000000-0000-0000-0000-000000000004')
    const after = await entitlements.listActiveByUser(USER, expiresAt)
    expect(after.map((e) => e.toSnapshot().courseRef)).toEqual([
      'adult-mural-dos-criadores-visitante',
    ])
    expect(after[0]?.expiresAt).toBeNull()
    expect(after[0]?.toSnapshot().productId).toBe('00000000-0000-0000-0000-000000000005')
    // Nenhuma chave Kids nasce do presente adulto.
    expect(await communities(app, USER)).toEqual([
      'adult-mural-dos-criadores',
      'adult-mural-dos-criadores-visitante',
    ])
    expect(hubCalls.length).toBeGreaterThanOrEqual(2)
  })

  test('recusas do Mural adulto espelham o Kids', async () => {
    const { app, entitlements, adult, clockRef } = setup()
    const trial = { ...adult, mode: 'mural_trial' }
    // Sem a matrícula do curso adulto da mesma origem.
    expect((await post(app, trial, 'r-missing')).status).toBe(409)
    expect((await post(app, { ...adult, mode: 'course' }, 'r-course')).status).toBe(200)
    // Mesmo resgate, mas pedindo o Mural Kids: o curso é adulto.
    const { audience: _audience, ...kidsTrial } = trial
    expect((await post(app, kidsTrial, 'r-kids')).status).toBe(409)
    for (const [key, override] of [
      ['r-source', { sourceId: 'scholarship:another' }],
      ['r-expiry', { expiresAt: new Date(clockRef.now.getTime() + 6 * DAY).toISOString() }],
    ] as const)
      expect((await post(app, { ...trial, ...override }, key)).status).toBe(409)
    for (const [key, override] of [
      ['b-source', { sourceId: 'manual:x' }],
      ['b-audience', { audience: 'pro' }],
    ] as const)
      expect((await post(app, { ...trial, ...override }, key)).status).toBe(400)
    expect(await entitlements.listByUserId(USER)).toHaveLength(1)
    // A falha não consome a entrega: o retry certo concede.
    expect((await post(app, trial, 'r-missing')).status).toBe(200)
    expect(await entitlements.listByUserId(USER)).toHaveLength(3)
  })

  test('Mural adulto recusa prazo maior que sete dias', async () => {
    const { app, entitlements, clockRef } = setup()
    const long = {
      userId: USER,
      sourceId: 'scholarship:adult-long',
      courseRef: 'cade-todo-mundo-adulto',
      expiresAt: new Date(clockRef.now.getTime() + 30 * DAY).toISOString(),
      audience: 'adult',
    }
    expect((await post(app, { ...long, mode: 'course' }, 'l-course')).status).toBe(200)
    expect((await post(app, { ...long, mode: 'mural_trial' }, 'l-mural')).status).toBe(409)
    expect(await entitlements.listByUserId(USER)).toHaveLength(1)
  })

  test('Mural adulto exige a matrícula gravada como presente adulto (giftAudience)', async () => {
    const { app, entitlements, courses, adult, expiresAt, clockRef } = setup()
    const course = courses.courses.find((c) => c.slug === 'cade-todo-mundo-adulto')
    if (!course) throw new Error('Curso adulto ausente')
    // Matrícula do curso adulto com a mesma origem, ativa e no prazo, mas SEM o público do
    // presente no snapshot (ex.: concessão manual por outro caminho): não abre o Mural adulto.
    const grantedAt = clockRef.now
    await entitlements.save(
      EntitlementAggregate.grant({
        id: '44444444-4444-4444-4444-444444444444',
        userId: USER,
        productId: course.id,
        productKind: 'course',
        accessType: 'course',
        courseRef: course.slug,
        offerId: null,
        snapshot: {
          offerId: '',
          offerSlug: '',
          productId: course.id,
          sku: '',
          name: course.title,
          kind: 'course',
          accessType: 'course',
          courseRef: course.slug,
          fulfillment: { accessType: 'course', courseRef: course.slug },
          resolvedAt: grantedAt.toISOString(),
        },
        sourceKind: 'manual',
        sourceId: adult.sourceId,
        subscriptionId: null,
        grantedAt,
        expiresAt,
        idempotencyKey: `manual:${USER}:${course.id}:${adult.sourceId}`,
      }),
    )
    expect((await post(app, { ...adult, mode: 'mural_trial' }, 'g-mural')).status).toBe(409)
    expect(await entitlements.listByUserId(USER)).toHaveLength(1)
  })

  test('o mesmo e-mail com presente Kids e adulto guarda os dois Murais sem colisão', async () => {
    const { app, entitlements, adult, expiresAt } = setup()
    const kids = {
      userId: USER,
      sourceId: 'scholarship:kids-1',
      courseRef: 'cade-todo-mundo',
      expiresAt: adult.expiresAt,
    }
    for (const [key, body] of [
      ['k-course', { ...kids, mode: 'course' }],
      ['k-mural', { ...kids, mode: 'mural_trial' }],
      ['a-course', { ...adult, mode: 'course' }],
      ['a-mural', { ...adult, mode: 'mural_trial' }],
    ] as const)
      expect((await post(app, body, key)).status).toBe(200)
    expect(await entitlements.listByUserId(USER)).toHaveLength(6)
    const kidsCourse = (await entitlements.listByUserId(USER)).find(
      (e) => e.toSnapshot().courseRef === 'cade-todo-mundo',
    )
    expect(kidsCourse?.snapshot.giftAudience).toBe('kids')
    expect(
      (await entitlements.listActiveByUser(USER, expiresAt))
        .map((e) => e.toSnapshot().courseRef)
        .sort(),
    ).toEqual(['adult-mural-dos-criadores-visitante', 'mural-dos-criadores-visitante'])
  })
})
