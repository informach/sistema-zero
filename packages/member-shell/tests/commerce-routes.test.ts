import { describe, expect, test } from 'bun:test'
import type { CommerceBlock, CommerceCatalogOffer } from '@sistemazero/core/commerce'
import type { CommerceAccess } from '../src/lib/commerce-eligibility'
import type { SessionUser } from '../src/lib/types'
import { type CommerceRouteDeps, createCommerceRoutes } from '../src/routes/commerce'
import type { CallOpts, GatewayResponse } from '../src/server/gateway'

const accountId = '10000000-0000-4000-8000-000000000001'
const lessonId = '20000000-0000-4000-8000-000000000001'
const blockId = '30000000-0000-4000-8000-000000000001'
const buyer: SessionUser = {
  id: accountId,
  email: 'responsavel@example.test',
  firstName: 'Pessoa',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
  kids: { kind: 'parent', sessionId: 'parent-session', authenticatedAt: 123 },
}
const offer: CommerceCatalogOffer = {
  id: '40000000-0000-4000-8000-000000000001',
  slug: 'comunidade-mensal',
  name: 'Comunidade',
  status: 'active',
  isAvailable: true,
  priceCents: 9900,
  pricingMode: 'subscription',
  billingIntervalMonths: 1,
  installmentsMax: null,
  accessMode: 'billing_cycle',
  accessDurationValue: null,
  accessDurationUnit: null,
  product: {
    id: '50000000-0000-4000-8000-000000000001',
    audience: 'kids',
    sku: 'COMUNIDADE',
    name: 'Comunidade',
    status: 'active',
  },
  content: null,
  includes: [],
}
const origin = { kind: 'lesson', courseSlug: 'curso-pais', lessonId, blockId }
function reply<T>(body: unknown, status = 200): GatewayResponse<T> {
  return { body: body as T, status }
}
function request(body: unknown, crossSite = false) {
  return new Request('https://kids.test/api/commerce', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': crossSite ? 'cross-site' : 'same-origin',
    },
    body: JSON.stringify(body),
  })
}
function setup() {
  let user: SessionUser | null = buyer
  let block: CommerceBlock | null = { kind: 'gift', campaignCode: 'curso-presente' }
  let authStatus = 200
  let accessStatus = 200
  let access: CommerceAccess[] = []
  let recovery: { status: number; body: unknown } = { status: 404, body: null }
  const calls: { path: string; body: unknown }[] = []
  const deps: CommerceRouteDeps = {
    audience: 'kids',
    session: { getSession: async () => user },
    auth: { getMe: async () => reply({ user: buyer }, authStatus) },
    members: {
      getLesson: async () =>
        reply({
          id: lessonId,
          slug: 'aula',
          title: 'Aula',
          moduleId: 'module',
          courseSlug: 'curso-pais',
          estimatedMinutes: null,
          completed: false,
          positionSeconds: null,
          attachments: [],
          blocks: block ? [{ id: blockId, kind: block.kind, content: block, sortOrder: 0 }] : [],
        }),
    },
    payments: {
      listMySubscriptions: async () => reply({ items: [] }),
      getCardConfig: async () =>
        reply({ available: false, accountIdentifier: null, environment: 'sandbox' }),
    },
    gateway: {
      async gatewayFetch<T>(path: string) {
        if (path.startsWith('/catalog/offers/')) return reply<T>(offer)
        if (path === '/catalog/member-promotions') return reply<T>({ items: [] })
        return reply<T>({ items: access }, accessStatus)
      },
      async gatewayFetchHmac<T>(path: string, options?: CallOpts) {
        calls.push({ path, body: options?.body })
        if (path.endsWith('/pending'))
          return reply<T>({
            items: [
              { checkoutId: '60000000-0000-4000-8000-000000000001', origin, title: offer.name },
            ],
          })
        if (path.endsWith('/recover')) return reply<T>(recovery.body, recovery.status)
        if (path.endsWith('/default-offer')) return reply<T>({ offer })
        if (path.includes('member-gifts'))
          return reply<T>({
            gift: {
              offerId: offer.id,
              offerTitle: offer.name,
              courseSlug: 'cade',
              courseTitle: 'Cadê',
              learner: 'child',
              accessDays: 7,
              includesMural: false,
            },
            state: 'active',
            kind: 'completed',
          })
        return reply<T>({ checkoutId: '60000000-0000-4000-8000-000000000001', status: 'READY' })
      },
    },
  }
  return {
    routes: createCommerceRoutes(deps),
    setRecovery: (status: number, body: unknown) => {
      recovery = { status, body }
    },
    calls,
    setUser: (value: SessionUser | null) => {
      user = value
    },
    setBlock: (value: CommerceBlock | null) => {
      block = value
    },
    setAuthStatus: (value: number) => {
      authStatus = value
    },
    setAccessStatus: (value: number) => {
      accessStatus = value
    },
    setAccess: (value: CommerceAccess[]) => {
      access = value
    },
  }
}
describe('blocos e cards comerciais autenticados', () => {
  test('recusa CSRF, perfil infantil e sessão de suporte sem conceder ou cobrar', async () => {
    const q = setup()
    expect((await q.routes.commerce.POST(request({ action: 'redeem', origin }, true))).status).toBe(
      403,
    )
    q.setUser({
      ...buyer,
      kids: { kind: 'student', sessionId: 'student', deviceId: 'device', grantId: 'grant' },
    })
    expect((await q.routes.commerce.POST(request({ action: 'redeem', origin }))).status).toBe(403)
    q.setUser({ ...buyer, act: { sub: 'support', mode: 'readonly' } })
    expect((await q.routes.commerce.POST(request({ action: 'redeem', origin }))).status).toBe(403)
    expect(q.calls).toHaveLength(0)
  })
  test('a identidade vem de /auth/me e a campanha vem do bloco da aula', async () => {
    const q = setup()
    expect(
      (
        await q.routes.commerce.POST(
          request({
            action: 'redeem',
            origin,
            data: { userId: 'outro', campaignCode: 'outro-presente' },
          }),
        )
      ).status,
    ).toBe(200)
    expect(q.calls.at(-1)?.body).toMatchObject({
      account: { userId: accountId, email: buyer.email },
      code: 'curso-presente',
      action: 'redeem',
    })
    expect(
      (
        await q.routes.commerce.POST(
          request({ action: 'redeem', origin, account: { userId: 'outro' } }),
        )
      ).status,
    ).toBe(400)
  })
  test('não aceita um bloco que não está no conteúdo servido da aula', async () => {
    const q = setup()
    q.setBlock(null)
    expect((await q.routes.commerce.POST(request({ action: 'redeem', origin }))).status).toBe(404)
    expect(q.calls).toHaveLength(0)
  })
  test('uma indisponibilidade não vira ausência de conta ou assinatura', async () => {
    const q = setup()
    q.setAuthStatus(503)
    expect((await q.routes.commerce.POST(request({ action: 'inspect', origin }))).status).toBe(503)
    q.setAuthStatus(200)
    q.setBlock({ kind: 'purchase', offerRef: offer.slug })
    q.setAccessStatus(503)
    expect((await q.routes.commerce.POST(request({ action: 'inspect', origin }))).status).toBe(503)
    expect(q.calls.every((c) => c.path.endsWith('/recover'))).toBe(true)
  })
  test('acesso pago encaminha para gerenciamento e não abre outro checkout', async () => {
    const q = setup()
    q.setBlock({ kind: 'purchase', offerRef: offer.slug })
    q.setAccess([{ productId: offer.product.id, offerId: offer.id, kind: 'paid', expiresAt: null }])
    const result = await q.routes.commerce.POST(request({ action: 'inspect', origin }))
    expect((await result.json()).mode).toBe('manage')
    expect(q.calls.map((c) => c.path)).toEqual(['/funnel/internal/commerce/recover'])
  })
  test('assinante Kids vê o curso incluído e não resgata uma bolsa', async () => {
    const q = setup()
    q.setAccess([
      {
        productId: 'comunidade',
        offerId: null,
        kind: 'paid',
        expiresAt: null,
        accessType: 'all_kids_courses',
        courseRef: null,
      },
    ])
    for (const action of ['inspect', 'redeem']) {
      const response = await q.routes.commerce.POST(request({ action, origin }))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        mode: 'included',
        courseTitle: 'Cadê',
        continueUrl: '/pais/familia',
      })
    }
    expect(
      q.calls
        .filter((c) => c.path.includes('member-gifts'))
        .every((c) => (c.body as { action: string }).action === 'inspect'),
    ).toBe(true)
  })
  test('chave adulta, comunidade e outro curso não substituem o presente Kids', async () => {
    const q = setup()
    q.setAccess([
      {
        productId: 'adulto',
        offerId: null,
        kind: 'paid',
        expiresAt: null,
        accessType: 'all_courses',
      },
      {
        productId: 'comunidade',
        offerId: null,
        kind: 'paid',
        expiresAt: null,
        accessType: 'community',
        courseRef: 'cade',
      },
      {
        productId: 'outro',
        offerId: null,
        kind: 'manual',
        expiresAt: null,
        accessType: 'course',
        courseRef: 'outro',
      },
    ])
    const response = await q.routes.commerce.POST(request({ action: 'inspect', origin }))
    expect((await response.json()).mode).toBe('gift')
  })
  test('presente existente continua resgatável; compra direta do curso é incluída', async () => {
    const q = setup()
    const course: CommerceAccess = {
      productId: 'cade',
      offerId: null,
      kind: 'gift',
      expiresAt: null,
      accessType: 'course',
      courseRef: 'cade',
    }
    q.setAccess([course])
    expect(
      (await (await q.routes.commerce.POST(request({ action: 'inspect', origin }))).json()).mode,
    ).toBe('gift')
    q.setAccess([{ ...course, kind: 'paid' }])
    expect(
      (await (await q.routes.commerce.POST(request({ action: 'redeem', origin }))).json()).mode,
    ).toBe('included')
  })
  test('falha ou projeção antiga não vira falta de acesso nem concede presente', async () => {
    const q = setup()
    q.setAccessStatus(503)
    expect((await q.routes.commerce.POST(request({ action: 'redeem', origin }))).status).toBe(503)
    q.setAccessStatus(200)
    q.setAccess([{ productId: 'legado', offerId: null, kind: 'paid', expiresAt: null }])
    expect((await q.routes.commerce.POST(request({ action: 'redeem', origin }))).status).toBe(503)
    expect(
      q.calls
        .filter((c) => c.path.includes('member-gifts'))
        .every((c) => (c.body as { action: string }).action === 'inspect'),
    ).toBe(true)
  })
  test('R04: reinspeção recupera operação própria antes do bloco removido e da elegibilidade', async () => {
    const q = setup()
    q.setBlock(null)
    q.setAccessStatus(503)
    q.setRecovery(200, {
      checkoutId: '60000000-0000-4000-8000-000000000001',
      origin,
      offer,
      status: 'PENDING',
      payment: { pix: { copiaECola: 'pix-original' } },
    })
    const response = await q.routes.commerce.POST(request({ action: 'inspect', origin }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      mode: 'purchase',
      origin,
      status: 'PENDING',
      payment: { pix: { copiaECola: 'pix-original' } },
    })
    expect(q.calls.map((c) => c.path)).toEqual(['/funnel/internal/commerce/recover'])
    q.setRecovery(503, null)
    expect((await q.routes.commerce.POST(request({ action: 'inspect', origin }))).status).toBe(503)
  })
  test('R04: Minhas compras lista as próprias operações e inspeciona por ID sem depender da apresentação', async () => {
    const q = setup()
    q.setBlock(null)
    const pending = await q.routes.commercePending.GET()
    expect(pending.status).toBe(200)
    const body = await pending.json()
    const item = body.items[0]
    expect(
      (
        await q.routes.commerce.POST(
          request({ action: 'inspect', origin: item.origin, checkoutId: item.checkoutId }),
        )
      ).status,
    ).toBe(200)
    expect(q.calls.at(-1)?.path).toBe('/funnel/internal/commerce/status')
    q.setUser(null)
    expect((await q.routes.commercePending.GET()).status).toBe(403)
  })
  test('o primeiro card resolve a oferta de assinatura do ambiente, sem link externo', async () => {
    const q = setup()
    const result = await q.routes.commercePromotions.GET()
    const body = await result.json()
    expect(body.items[0].origin).toEqual({ kind: 'community' })
    expect(body.items[0].offerRef).toBe(offer.slug)
    expect(q.calls[0]?.path).toBe('/funnel/internal/commerce/default-offer')
  })
})
