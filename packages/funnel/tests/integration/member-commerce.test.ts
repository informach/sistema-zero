import { beforeEach, describe, expect, test } from 'bun:test'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import { clearOfferCache } from '../../src/server/catalog'
import { handleMemberCommerce, type MemberCommerceDeps } from '../../src/server/member-commerce'
import type {
  MemberCheckout,
  MemberCommerceStore,
  MemberCustomer,
} from '../../src/server/member-commerce-store'
import { makeGrantMembers } from '../../src/server/members-grant'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const accountId = '10000000-0000-4000-8000-000000000001'
const offer: CommerceCatalogOffer = {
  id: '20000000-0000-4000-8000-000000000001',
  slug: 'curso-qa',
  name: 'Curso de teste',
  status: 'active',
  isAvailable: true,
  priceCents: 3700,
  pricingMode: 'one_time',
  billingIntervalMonths: null,
  installmentsMax: 1,
  accessMode: 'fixed',
  accessDurationValue: 7,
  accessDurationUnit: 'days',
  product: {
    id: '30000000-0000-4000-8000-000000000001',
    audience: 'kids',
    sku: 'CURSO',
    name: 'Curso',
    status: 'active',
  },
  content: null,
  includes: [],
}
const input = {
  account: { userId: accountId, email: 'ana@example.com', name: 'Ana Souza', audience: 'kids' },
  origin: { kind: 'promotion', offerRef: offer.slug },
  offerRef: offer.slug,
}
function request(body: unknown, token = 'internal-secret') {
  return new Request('http://funnel/api/internal/commerce/inspect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': token },
    body: JSON.stringify(body),
  })
}
function setup() {
  const state = createFakeRepo()
  const gw = createFakeGateway()
  gw.gateway.getOffer = async () => ({ status: 200, body: offer })
  const checkouts = new Map<string, MemberCheckout>()
  let customer: MemberCustomer | null = null
  const claims = new Map<
    string,
    import('../../src/server/member-commerce-store').MemberProductClaim
  >()
  let queue = Promise.resolve()
  const store: MemberCommerceStore = {
    async customer() {
      return customer
    },
    async prepare(i) {
      const existing = [...checkouts.values()].find(
        (c) => c.accountId === i.accountId && c.offerId === i.offerId,
      )
      const originKey = JSON.stringify(i.origin)
      if (existing && i.replaceCheckoutId !== existing.id) {
        existing.originKeys = [...new Set([...existing.originKeys, originKey])]
        return structuredClone(existing)
      }
      const lead = await state.repo.createLead('kids/member-commerce')
      await state.repo.updateLead(lead.id, {
        nome: i.contact.nome,
        email: i.contact.email,
        buyerUserId: i.accountId,
        buyerIsNew: false,
        buyerRegisteredAt: new Date(),
        memberContext: i.context,
      })
      const checkout: MemberCheckout = {
        id: crypto.randomUUID(),
        accountId: i.accountId,
        offerId: i.offerId,
        offerRef: i.offerRef,
        leadId: lead.id,
        origin: i.origin,
        originKeys: [originKey],
        presentation: i.presentation,
        pendingRequest: null,
        dispatchPlan: null,
        attemptPhase: 'ready',
        cardAttemptId: crypto.randomUUID(),
        createdAt: new Date(),
      }
      if (existing) checkouts.delete(existing.id)
      checkouts.set(checkout.id, checkout)
      return structuredClone(checkout)
    },
    async owned(id, account) {
      const c = checkouts.get(id)
      return c?.accountId === account ? structuredClone(c) : null
    },
    async recover(account, audience, origin) {
      const c = [...checkouts.values()]
        .reverse()
        .find(
          (c) =>
            c.accountId === account &&
            c.presentation.offer.product.audience === audience &&
            c.originKeys.includes(JSON.stringify(origin)) &&
            (c.pendingRequest !== null ||
              Boolean(state.leads.get(c.leadId)?.paymentId) ||
              Boolean(state.leads.get(c.leadId)?.subscriptionId)),
        )
      return c ? structuredClone(c) : null
    },
    async pending(account, audience) {
      return [...checkouts.values()].filter(
        (c) =>
          c.accountId === account &&
          c.presentation.offer.product.audience === audience &&
          (c.pendingRequest ||
            state.leads.get(c.leadId)?.paymentId ||
            state.leads.get(c.leadId)?.subscriptionId) &&
          !(state.leads.get(c.leadId)?.paidAt && state.leads.get(c.leadId)?.membersGrantedAt),
      )
    },
    async withProductLock(account, product, task) {
      const before = queue
      let release!: () => void
      queue = new Promise<void>((resolve) => {
        release = resolve
      })
      await before
      try {
        return await task({
          repo: state.repo,
          claim: structuredClone(claims.get(`${account}:${product}`) ?? null),
          owned: (id) => store.owned(id, account),
          async registerOrigins(checkout, keys) {
            const current = checkouts.get(checkout.id)!
            current.originKeys = [...new Set([...current.originKeys, ...keys])]
            return structuredClone(current)
          },
          async savePlan(checkout, pendingRequest, dispatchPlan, value) {
            const c = {
              ...checkout,
              pendingRequest,
              dispatchPlan,
              attemptPhase: 'dispatched' as const,
            }
            checkouts.set(c.id, structuredClone(c))
            claims.set(`${account}:${product}`, {
              accountId: account,
              productId: product,
              checkoutId: c.id,
              leadId: c.leadId,
              createdAt: new Date(),
            })
            customer = {
              accountId: account,
              contact: value.contact,
              birth: value.birth ?? null,
              address: value.address ?? null,
              updatedAt: new Date(),
            }
            return structuredClone(c)
          },
        })
      } finally {
        release()
      }
    },
    async rejectPlan(id, account, planId) {
      const c = checkouts.get(id)
      if (c?.accountId !== account || c.dispatchPlan?.id !== planId) return
      c.pendingRequest = null
      c.dispatchPlan = null
      c.attemptPhase = 'rejected'
      c.cardAttemptId = crypto.randomUUID()
      const key = `${account}:${c.presentation.offer.product.id}`
      if (claims.get(key)?.checkoutId === id) claims.delete(key)
    },
    async clearRecordedPlan(id, account, planId) {
      const c = checkouts.get(id)
      if (c?.accountId !== account || c.dispatchPlan?.id !== planId) return
      c.pendingRequest = null
      c.dispatchPlan = null
      c.attemptPhase = 'recorded'
    },
  }
  const deps: MemberCommerceDeps = {
    internalToken: 'internal-secret',
    repo: state.repo,
    gateway: gw.gateway,
    store,
    checkout: {},
    funnelUrl: 'https://funnel.example.com',
    termsForOffer: () => ({ url: 'https://funnel.example.com/termos', version: 'qa' }),
  }
  return { deps, gw, state }
}
describe('checkout da conta autenticada', () => {
  beforeEach(() => clearOfferCache())
  test('status remove o token quando a entrega concluiu antes de falhar a limpeza local', async () => {
    const { deps, gw, state } = setup()
    gw.setStatus('PAID')
    deps.checkout.grantMembers = async (lead) => {
      state.leads.get(lead.id)!.membersGrantedAt = new Date()
    }
    const clear = deps.store.clearRecordedPlan
    let fail = true
    deps.store.clearRecordedPlan = async (...args) => {
      if (fail) {
        fail = false
        throw new Error('Falha de limpeza')
      }
      return clear(...args)
    }
    const checkout = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: checkout.checkoutId }
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      installments: 1,
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    await expect(handleMemberCommerce(request({ ...base, data }), 'pay', deps)).rejects.toThrow(
      'Falha de limpeza',
    )
    expect((await deps.store.owned(checkout.checkoutId, accountId))?.dispatchPlan).toBeTruthy()
    expect(await (await handleMemberCommerce(request(base), 'status', deps)).json()).toMatchObject({
      status: 'PAID',
      accessGranted: true,
    })
    expect((await deps.store.owned(checkout.checkoutId, accountId))?.dispatchPlan).toBeNull()
    expect(gw.calls.create).toHaveLength(1)
  })
  test('VALIDATION_ERROR sem prova de fase não descarta uma tentativa possivelmente cobrada', async () => {
    const { deps, gw } = setup()
    const checkout = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: checkout.checkoutId }
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      installments: 1,
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    gw.setCreateResult(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Falha em fase desconhecida' },
    })
    expect((await handleMemberCommerce(request({ ...base, data }), 'pay', deps)).status).toBe(502)
    expect((await (await handleMemberCommerce(request(base), 'status', deps)).json()).status).toBe(
      'PROCESSING',
    )
  })
  test('R01: resposta perdida é reconciliada com corpo/chave originais mesmo após mudar o preço', async () => {
    const { deps, gw, state } = setup()
    gw.setStatus('PAID')
    const create = gw.gateway.createPayment
    let lose = true
    gw.gateway.createPayment = async (data, key) => {
      const result = await create(data, key)
      if (lose) {
        lose = false
        return { status: 504, body: null }
      }
      return result
    }
    const checkout = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: checkout.checkoutId }
    const card = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'provider-token',
      brand: 'visa',
      last4: '1111',
      installments: 1,
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    expect((await handleMemberCommerce(request({ ...base, data: card }), 'pay', deps)).status).toBe(
      502,
    )
    gw.setOfferPrice(4700)
    gw.gateway.getOffer = async () => ({ status: 503, body: null })
    expect(
      (await handleMemberCommerce(request({ ...base, data: { resume: true } }), 'pay', deps))
        .status,
    ).toBe(200)
    expect(gw.calls.create).toHaveLength(2)
    expect(gw.calls.create[0]).toEqual(gw.calls.create[1])
    expect([...state.leads.values()][0]?.paidAt).toBeTruthy()
  })
  test('R03: rejeição comprovada antes da criação libera correção, mas falha desconhecida conserva a intenção', async () => {
    const { deps, gw } = setup()
    const checkout = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: checkout.checkoutId }
    const card = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'rejected-token',
      brand: 'visa',
      last4: '1111',
      installments: 1,
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    gw.setCreateResult(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Dados rejeitados antes da criação' },
      paymentCreation: 'not_started',
    })
    expect((await handleMemberCommerce(request({ ...base, data: card }), 'pay', deps)).status).toBe(
      400,
    )
    expect((await (await handleMemberCommerce(request(base), 'status', deps)).json()).status).toBe(
      'READY',
    )
    gw.setCreateResult(201, {
      id: 'corrected-payment',
      status: 'PENDING',
      card: { brand: 'visa', last4: '1111', installments: 1 },
    })
    expect(
      (
        await handleMemberCommerce(
          request({ ...base, data: { ...card, token: 'corrected-token' } }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(200)
    expect(gw.calls.create[1]?.input).toMatchObject({ card: { token: 'corrected-token' } })
    expect(gw.calls.create[0]?.idempotencyKey).not.toBe(gw.calls.create[1]?.idempotencyKey)
  })
  test('R02: mensal e anual confirmados em paralelo adotam a mesma assinatura, mesmo com resposta perdida', async () => {
    const { deps, gw } = setup()
    const monthly = {
      ...offer,
      pricingMode: 'subscription' as const,
      billingIntervalMonths: 1,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    }
    const annual = {
      ...monthly,
      id: '20000000-0000-4000-8000-000000000002',
      slug: 'curso-anual',
      billingIntervalMonths: 12,
    }
    gw.gateway.getOffer = async (ref) => ({
      status: 200,
      body: ref === annual.slug ? annual : monthly,
    })
    for (const o of [monthly, annual])
      gw.setOfferConfig(o.slug, {
        pricingMode: 'subscription',
        billingIntervalMonths: o.billingIntervalMonths,
      })
    const annualInput = {
      ...input,
      offerRef: annual.slug,
      origin: { kind: 'promotion', offerRef: annual.slug },
    }
    const a = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const b = await (await handleMemberCommerce(request(annualInput), 'inspect', deps)).json()
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      birth: '1985-01-01',
      address: {
        street: 'Rua Teste',
        number: '10',
        neighborhood: 'Centro',
        zipcode: '01001000',
        city: 'São Paulo',
        state: 'SP',
      },
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    gw.setSubscriptionResult(504, null)
    const results = await Promise.all([
      handleMemberCommerce(request({ ...input, checkoutId: a.checkoutId, data }), 'pay', deps),
      handleMemberCommerce(
        request({ ...annualInput, checkoutId: b.checkoutId, data }),
        'pay',
        deps,
      ),
    ])
    expect(gw.calls.createSubscription).toHaveLength(1)
    expect(results[0]?.status).toBe(502)
    expect(await results[1]?.json()).toMatchObject({
      checkoutId: a.checkoutId,
      origin: input.origin,
      status: 'PROCESSING',
    })
    gw.setSubscriptionResult(201, {
      id: 'subscription-1',
      status: 'ACTIVE',
      firstPayment: { id: 'payment-1', status: 'PAID' },
    })
    expect(
      (
        await handleMemberCommerce(
          request({ ...input, checkoutId: a.checkoutId, data: { resume: true } }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(200)
    const before = gw.calls.createSubscription.length
    expect(
      (
        await handleMemberCommerce(
          request({ ...annualInput, checkoutId: b.checkoutId, data }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(200)
    expect(gw.calls.createSubscription).toHaveLength(before)
  })
  test('R02: primeira parcela falha não libera assinatura ativa; cancelamento confirmado permite outra oferta', async () => {
    const { deps, gw } = setup()
    const monthly = {
      ...offer,
      pricingMode: 'subscription' as const,
      billingIntervalMonths: 1,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    }
    const annual = {
      ...monthly,
      id: '20000000-0000-4000-8000-000000000002',
      slug: 'curso-anual',
      billingIntervalMonths: 12,
    }
    gw.gateway.getOffer = async (ref) => ({
      status: 200,
      body: ref === annual.slug ? annual : monthly,
    })
    for (const item of [monthly, annual])
      gw.setOfferConfig(item.slug, {
        pricingMode: 'subscription',
        billingIntervalMonths: item.billingIntervalMonths,
      })
    const other = {
      ...input,
      offerRef: annual.slug,
      origin: { kind: 'promotion', offerRef: annual.slug },
    }
    const a = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const b = await (await handleMemberCommerce(request(other), 'inspect', deps)).json()
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      birth: '1985-01-01',
      address: {
        street: 'Rua',
        number: '10',
        neighborhood: 'Centro',
        zipcode: '01001000',
        city: 'São Paulo',
        state: 'SP',
      },
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    gw.setSubscriptionResult(201, {
      id: 'subscription-1',
      status: 'PENDING',
      firstPayment: { id: 'payment-1', status: 'FAILED' },
    })
    gw.setStatus('FAILED')
    await handleMemberCommerce(request({ ...input, checkoutId: a.checkoutId, data }), 'pay', deps)
    gw.gateway.getSubscription = async () => ({ status: 200, body: { status: 'ACTIVE' } })
    expect(
      await (
        await handleMemberCommerce(
          request({ ...other, checkoutId: b.checkoutId, data }),
          'pay',
          deps,
        )
      ).json(),
    ).toMatchObject({ checkoutId: a.checkoutId })
    expect(gw.calls.createSubscription).toHaveLength(1)
    gw.gateway.getSubscription = async () => ({ status: 503, body: null })
    await handleMemberCommerce(request({ ...other, checkoutId: b.checkoutId, data }), 'pay', deps)
    expect(gw.calls.createSubscription).toHaveLength(1)
    gw.gateway.getSubscription = async () => ({ status: 200, body: { status: 'CANCELED' } })
    expect(
      (
        await handleMemberCommerce(
          request({ ...other, checkoutId: b.checkoutId, data }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(200)
    expect(gw.calls.createSubscription).toHaveLength(2)
  })
  test('R02: compra paga só libera recompra depois de confirmar o fim do direito, conservando falha fechada', async () => {
    const { deps, gw, state } = setup()
    const otherOffer = { ...offer, id: '20000000-0000-4000-8000-000000000002', slug: 'curso-outro' }
    gw.gateway.getOffer = async (ref) => ({
      status: 200,
      body: ref === otherOffer.slug ? otherOffer : offer,
    })
    const other = {
      ...input,
      offerRef: otherOffer.slug,
      origin: { kind: 'promotion', offerRef: otherOffer.slug },
    }
    const a = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const b = await (await handleMemberCommerce(request(other), 'inspect', deps)).json()
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      installments: 1,
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    gw.setStatus('PAID')
    await handleMemberCommerce(request({ ...input, checkoutId: a.checkoutId, data }), 'pay', deps)
    const lead = [...state.leads.values()].find((l) => l.paymentId)!
    lead.membersGrantedAt = new Date()
    gw.gateway.getCommerceAccess = async () => ({
      status: 200,
      body: { items: [{ productId: offer.product.id, kind: 'paid' }] },
    })
    expect(
      await (
        await handleMemberCommerce(
          request({ ...other, checkoutId: b.checkoutId, data }),
          'pay',
          deps,
        )
      ).json(),
    ).toMatchObject({ checkoutId: a.checkoutId })
    gw.gateway.getCommerceAccess = async () => ({ status: 503, body: null })
    await handleMemberCommerce(request({ ...other, checkoutId: b.checkoutId, data }), 'pay', deps)
    expect(gw.calls.create).toHaveLength(1)
    gw.gateway.getCommerceAccess = async () => ({ status: 200, body: { items: [] } })
    expect(
      (
        await handleMemberCommerce(
          request({ ...other, checkoutId: b.checkoutId, data }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(200)
    expect(gw.calls.create).toHaveLength(2)
  })
  test('retoma recibo parcialmente gravado após falha local, sem recotar nem trocar a chave', async () => {
    const { deps, gw } = setup()
    const subscription = {
      ...offer,
      pricingMode: 'subscription' as const,
      billingIntervalMonths: 1,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    }
    gw.gateway.getOffer = async () => ({ status: 200, body: subscription })
    gw.setOfferConfig(offer.slug, { pricingMode: 'subscription', billingIntervalMonths: 1 })
    const checkout = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: checkout.checkoutId }
    const setPayment = deps.repo.setPayment
    deps.repo.setPayment = async () => {
      throw new Error('Falha local depois do recibo da assinatura')
    }
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      birth: '1985-01-01',
      address: {
        street: 'Rua',
        number: '10',
        neighborhood: 'Centro',
        zipcode: '01001000',
        city: 'São Paulo',
        state: 'SP',
      },
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    await expect(handleMemberCommerce(request({ ...base, data }), 'pay', deps)).rejects.toThrow(
      'Falha local',
    )
    expect((await (await handleMemberCommerce(request(base), 'status', deps)).json()).status).toBe(
      'PROCESSING',
    )
    deps.repo.setPayment = setPayment
    gw.gateway.getOffer = async () => ({ status: 503, body: null })
    expect(
      (await handleMemberCommerce(request({ ...base, data: { resume: true } }), 'pay', deps))
        .status,
    ).toBe(200)
    expect(gw.calls.createSubscription[0]).toEqual(gw.calls.createSubscription[1])
    expect((await deps.store.owned(checkout.checkoutId, accountId))?.dispatchPlan).toBeNull()
  })
  test('R04: recupera Pix pela origem sem ID, com catálogo fora; não expõe outro público/conta/origem', async () => {
    const { deps, gw, state } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    expect((await handleMemberCommerce(request(input), 'recover', deps)).status).toBe(404)
    await handleMemberCommerce(
      request({
        ...input,
        checkoutId: body.checkoutId,
        data: {
          method: 'pix',
          acceptedTerms: true,
          termsVersion: 'qa',
          contact: { cpf: '52998224725', telefone: '11988887777' },
        },
      }),
      'pay',
      deps,
    )
    expect(await (await handleMemberCommerce(request(input), 'pending', deps)).json()).toEqual({
      items: [{ checkoutId: body.checkoutId, origin: input.origin, title: offer.name }],
    })
    gw.gateway.getOffer = async () => ({ status: 503, body: null })
    const result = await (await handleMemberCommerce(request(input), 'recover', deps)).json()
    expect(result).toMatchObject({
      checkoutId: body.checkoutId,
      status: 'PENDING',
      payment: { pix: { copiaECola: expect.any(String) } },
    })
    for (const value of [
      { ...input, origin: { kind: 'promotion', offerRef: 'outra-oferta' } },
      { ...input, account: { ...input.account, audience: 'adult' } },
      { ...input, account: { ...input.account, userId: '90000000-0000-4000-8000-000000000001' } },
    ])
      expect((await handleMemberCommerce(request(value), 'recover', deps)).status).toBe(404)
    expect(state.leads.size).toBe(1)
    expect(gw.calls.create).toHaveLength(1)
  })
  test('R03: CEP sem dígitos é recusado antes de reservar a intenção', async () => {
    const { deps, gw } = setup()
    const subscription = {
      ...offer,
      pricingMode: 'subscription' as const,
      billingIntervalMonths: 1,
      accessMode: 'billing_cycle',
    }
    gw.gateway.getOffer = async () => ({ status: 200, body: subscription })
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'qa',
      token: 'token',
      brand: 'visa',
      last4: '1111',
      birth: '1985-01-01',
      address: {
        street: 'Rua',
        number: '10',
        neighborhood: 'Centro',
        zipcode: 'abc',
        city: 'São Paulo',
        state: 'SP',
      },
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    expect(
      (
        await handleMemberCommerce(
          request({ ...input, checkoutId: body.checkoutId, data }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(400)
    expect(gw.calls.createSubscription).toHaveLength(0)
    expect(
      (
        await (
          await handleMemberCommerce(
            request({ ...input, checkoutId: body.checkoutId }),
            'status',
            deps,
          )
        ).json()
      ).status,
    ).toBe('READY')
  })
  test('cartão avulso cobra a oferta vinculada à conta, usando apenas token', async () => {
    const { deps, gw } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const response = await handleMemberCommerce(
      request({
        ...input,
        checkoutId: body.checkoutId,
        data: {
          method: 'card',
          acceptedTerms: true,
          termsVersion: 'qa',
          token: 'provider-token-only',
          brand: 'visa',
          last4: '1111',
          installments: 1,
          contact: { cpf: '52998224725', telefone: '11988887777' },
        },
      }),
      'pay',
      deps,
    )
    expect(response.status).toBe(200)
    expect(gw.calls.create).toHaveLength(1)
    expect(gw.calls.create[0]?.input).toMatchObject({
      method: 'CREDIT_CARD',
      card: { token: 'provider-token-only' },
      customer: { email: input.account.email },
      metadata: { accountUserId: accountId },
    })
    expect(gw.calls.createSubscription).toHaveLength(0)
  })
  test('Pix mensal não deixa tentativa travada: a conta pode corrigir para cartão recorrente', async () => {
    const { deps, gw } = setup()
    const subscription = {
      ...offer,
      pricingMode: 'subscription' as const,
      billingIntervalMonths: 1,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    }
    gw.gateway.getOffer = async () => ({ status: 200, body: subscription })
    gw.setOfferConfig(offer.slug, { pricingMode: 'subscription', billingIntervalMonths: 1 })
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    const data = {
      method: 'pix',
      acceptedTerms: true,
      termsVersion: 'qa',
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    expect((await handleMemberCommerce(request({ ...base, data }), 'pay', deps)).status).toBe(409)
    expect((await (await handleMemberCommerce(request(base), 'status', deps)).json()).status).toBe(
      'READY',
    )
    const response = await handleMemberCommerce(
      request({
        ...base,
        data: {
          ...data,
          method: 'card',
          token: 'provider-reusable-token',
          brand: 'visa',
          last4: '1111',
          birth: '1985-01-01',
          address: {
            street: 'Rua Teste',
            number: '10',
            neighborhood: 'Centro',
            zipcode: '01001000',
            city: 'São Paulo',
            state: 'SP',
          },
        },
      }),
      'pay',
      deps,
    )
    expect(response.status).toBe(200)
    expect(gw.calls.create).toHaveLength(0)
    expect(gw.calls.createSubscription).toHaveLength(1)
    expect(gw.calls.ensureBuyer).toHaveLength(0)
  })
  test('recusa identidade enviada sem a autenticação interna', async () => {
    const { deps, state } = setup()
    expect((await handleMemberCommerce(request(input, 'forged'), 'inspect', deps)).status).toBe(401)
    expect(state.leads.size).toBe(0)
  })
  test('prepara e retoma a compra da mesma conta sem criar outro comprador', async () => {
    const { deps, state, gw } = setup()
    const first = await handleMemberCommerce(request(input), 'inspect', deps)
    const body = await first.json()
    const again = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    expect(again.checkoutId).toBe(body.checkoutId)
    expect(state.leads.size).toBe(1)
    expect([...state.leads.values()][0]?.buyerUserId).toBe(accountId)
    expect(gw.calls.ensureBuyer).toHaveLength(0)
  })
  test('não permite consultar a compra de outra conta', async () => {
    const { deps } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const res = await handleMemberCommerce(
      request({
        ...input,
        account: { ...input.account, userId: '90000000-0000-4000-8000-000000000001' },
        checkoutId: body.checkoutId,
      }),
      'status',
      deps,
    )
    expect(res.status).toBe(404)
  })
  test('ignora e-mail forjado de cobrança, pede CPF e não duplica um Pix pendente', async () => {
    const { deps, gw } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    expect(
      (
        await handleMemberCommerce(
          request({ ...base, data: { method: 'pix', acceptedTerms: true, termsVersion: 'qa' } }),
          'pay',
          deps,
        )
      ).status,
    ).toBe(400)
    expect(gw.calls.create).toHaveLength(0)
    const data = {
      method: 'pix',
      acceptedTerms: true,
      termsVersion: 'qa',
      contact: {
        nome: 'Ana Souza',
        email: 'outra@example.com',
        cpf: '52998224725',
        telefone: '11988887777',
      },
    }
    expect((await handleMemberCommerce(request({ ...base, data }), 'pay', deps)).status).toBe(200)
    expect((await handleMemberCommerce(request({ ...base, data }), 'pay', deps)).status).toBe(200)
    expect(gw.calls.create).toHaveLength(1)
    expect(gw.calls.create[0]?.input).toMatchObject({ customer: { email: 'ana@example.com' } })
    const restored = await (await handleMemberCommerce(request(base), 'status', deps)).json()
    expect(restored.status).toBe('PENDING')
    expect(restored.payment.pix.copiaECola).toBeTruthy()
  })
  test('só concede acesso depois da confirmação, para o comprador autenticado', async () => {
    const { deps, gw, state } = setup()
    deps.checkout.grantMembers = makeGrantMembers({
      repo: state.repo,
      gateway: gw.gateway,
      resolveOffer: () => ({ offerSlug: offer.slug }),
    })
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    await handleMemberCommerce(
      request({
        ...base,
        data: {
          method: 'pix',
          acceptedTerms: true,
          termsVersion: 'qa',
          contact: { cpf: '52998224725', telefone: '11988887777' },
        },
      }),
      'pay',
      deps,
    )
    expect(gw.calls.grant).toHaveLength(0)
    gw.setStatus('PAID')
    const status = await (await handleMemberCommerce(request(base), 'status', deps)).json()
    expect(status.accessGranted).toBe(true)
    expect(gw.calls.grant).toHaveLength(1)
    expect(gw.calls.grant[0]?.input).toMatchObject({ userId: accountId })
  })
  test('retoma a mesma tentativa após resposta perdida, sem pedir os dados novamente', async () => {
    const { deps, gw } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    const create = gw.gateway.createPayment
    let lose = true
    gw.gateway.createPayment = async (data, key) => {
      const result = await create(data, key)
      if (lose) {
        lose = false
        return { status: 504, body: { error: { code: 'GATEWAY_TIMEOUT' } } }
      }
      return result
    }
    const result = await handleMemberCommerce(
      request({
        ...base,
        data: {
          method: 'pix',
          acceptedTerms: true,
          termsVersion: 'qa',
          contact: { cpf: '52998224725', telefone: '11988887777' },
        },
      }),
      'pay',
      deps,
    )
    expect(result.status).toBe(502)
    expect((await (await handleMemberCommerce(request(base), 'status', deps)).json()).status).toBe(
      'PROCESSING',
    )
    expect(
      (await handleMemberCommerce(request({ ...base, data: { resume: true } }), 'pay', deps))
        .status,
    ).toBe(200)
    expect(gw.calls.create).toHaveLength(2)
    expect(gw.calls.create[0]).toEqual(gw.calls.create[1])
  })
  test('consulta o pagamento já iniciado mesmo com o catálogo temporariamente fora', async () => {
    const { deps, gw } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    await handleMemberCommerce(
      request({
        ...base,
        data: {
          method: 'pix',
          acceptedTerms: true,
          termsVersion: 'qa',
          contact: { cpf: '52998224725', telefone: '11988887777' },
        },
      }),
      'pay',
      deps,
    )
    gw.gateway.getOffer = async () => ({ status: 503, body: null })
    const restored = await (await handleMemberCommerce(request(base), 'status', deps)).json()
    expect(restored.status).toBe('PENDING')
    expect(restored.payment.pix.copiaECola).toBeTruthy()
  })
  test('nova tentativa só nasce quando o pagamento anterior terminou', async () => {
    const { deps, gw, state } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    const data = {
      method: 'pix',
      acceptedTerms: true,
      termsVersion: 'qa',
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    await handleMemberCommerce(request({ ...base, data }), 'pay', deps)
    expect((await handleMemberCommerce(request(base), 'restart', deps)).status).toBe(409)
    gw.setStatus('EXPIRED')
    const restarted = await (await handleMemberCommerce(request(base), 'restart', deps)).json()
    expect(restarted.status).toBe('READY')
    expect(restarted.checkoutId).not.toBe(body.checkoutId)
    expect(state.leads.size).toBe(2)
    expect((await handleMemberCommerce(request(base), 'status', deps)).status).toBe(404)
    expect(gw.calls.create).toHaveLength(1)
  })
  test('preço e condições alterados exigem nova confirmação antes da cobrança', async () => {
    const { deps, gw } = setup()
    const body = await (await handleMemberCommerce(request(input), 'inspect', deps)).json()
    const base = { ...input, checkoutId: body.checkoutId }
    const data = {
      method: 'pix',
      acceptedTerms: true,
      termsVersion: 'qa',
      expectedPriceCents: 3700,
      contact: { cpf: '52998224725', telefone: '11988887777' },
    }
    gw.setOfferPrice(4700)
    expect((await handleMemberCommerce(request({ ...base, data }), 'pay', deps)).status).toBe(409)
    expect(gw.calls.create).toHaveLength(0)
    expect((await (await handleMemberCommerce(request(base), 'status', deps)).json()).status).toBe(
      'READY',
    )
  })
})
