import { beforeEach, describe, expect, test } from 'bun:test'
import type { Env } from '../../src/lib/env'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { clearOfferCache } from '../../src/server/catalog'
import { startCard, startPix, startSubscription } from '../../src/server/checkout'
import { makeSendChargeFailed } from '../../src/server/dunning'
import { makeFulfill } from '../../src/server/fulfillment'
import { makeExtendMembersForCycle, makeGrantMembers } from '../../src/server/members-grant'
import { makeResolveOffer } from '../../src/server/offer'
import { handlePaymentWebhook } from '../../src/server/webhook'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const WEBHOOK_TOKEN = 'token-interno-do-gateway'
const CONTACT = {
  nome: 'Ana Souza',
  email: 'ana@example.com',
  cpf: '529.982.247-25',
  telefone: '(11) 98888-7777',
}
const ADDRESS = {
  street: 'Rua das Flores',
  number: '100',
  neighborhood: 'Centro',
  zipcode: '01001000',
  city: 'São Paulo',
  state: 'SP',
}
const SUB_CARD = {
  token: 'paytok-abc',
  brand: 'visa' as const,
  last4: '0087',
  attemptId: 'a1',
  contact: CONTACT,
  birth: '1990-05-10',
  address: ADDRESS,
}

// A oferta PRINCIPAL do funil nos testes é a MENSAL (assinatura); a ANUAL é a irmã.
const MONTHLY = 'clube-mensal'
const ANNUAL = 'clube-anual'

function deps(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  gw: ReturnType<typeof createFakeGateway>,
  offerSlug = MONTHLY,
) {
  return {
    repo,
    gateway: gw.gateway,
    resolveOffer: () => ({
      offerSlug,
      productName: 'Clube dos Criadores',
      productSku: 'clube-dos-criadores',
    }),
    fulfill: makeFulfill({ repo, gateway: gw.gateway }),
    grantMembers: makeGrantMembers({
      gateway: gw.gateway,
      resolveOffer: () => ({ offerSlug }),
      repo,
    }),
  }
}

function req(cookie?: string, body?: unknown): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/checkout/subscription', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const cookieFor = (id: string) => `${LEAD_COOKIE}=${id}`

function subscriptionGateway() {
  const gw = createFakeGateway()
  gw.setOfferConfig(MONTHLY, {
    priceCents: 4700,
    pricingMode: 'subscription',
    billingIntervalMonths: 1,
    altOffer: { slug: ANNUAL, label: 'Economize no anual' },
  })
  gw.setOfferConfig(ANNUAL, {
    priceCents: 47000,
    pricingMode: 'subscription',
    billingIntervalMonths: 12,
    altOffer: { slug: MONTHLY },
  })
  return gw
}

async function readyLead(repo: ReturnType<typeof createFakeRepo>['repo']) {
  const { id } = await repo.createLead()
  await repo.updateLead(id, {
    nome: 'Ana Souza',
    email: 'ana@example.com',
    telefone: '11999998888',
  })
  return id
}

beforeEach(() => {
  // O cache da oferta ativa é por SLUG e vive no módulo — configs diferentes por
  // caso de teste precisam de cache limpo.
  clearOfferCache()
})

describe('POST /api/checkout/subscription', () => {
  test('cria a assinatura (mensal), grava subscription no lead e marca pago no ACTIVE', async () => {
    const { repo, leads, events, payments } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const res = await startSubscription(req(cookieFor(id), SUB_CARD), deps(repo, gw))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      subscriptionId: string
      status: string
      paymentId: string | null
      paymentStatus: string | null
    }
    expect(body.subscriptionId).toBe('sub-1')
    expect(body.status).toBe('ACTIVE')
    expect(body.paymentId).toBe('pay-sub-1')
    expect(body.paymentStatus).toBe('PAID')

    // Corpo da criação: preço autoritativo + pagador completo + cartão sem parcelas.
    const input = gw.calls.createSubscription[0]?.input as {
      amountInCents: number
      intervalMonths: number
      customer: { birth: string; address: Record<string, string>; phone: string }
      card: Record<string, string>
    }
    expect(input.amountInCents).toBe(4700)
    expect(input.intervalMonths).toBe(1)
    expect(input.customer.birth).toBe('1990-05-10')
    expect(input.customer.address.street).toBe('Rua das Flores')
    expect(input.card).toEqual({ token: 'paytok-abc', brand: 'visa', last4: '0087' })
    expect(gw.calls.createSubscription[0]?.idempotencyKey).toBe(`funil-${id}-sub-a1`)

    // Lead: assinatura + 1º ciclo registrados; pago; evento de confirmação.
    const lead = leads.get(id)
    expect(lead?.subscriptionId).toBe('sub-1')
    expect(lead?.subscriptionIntervalMonths).toBe(1)
    expect(lead?.paymentId).toBe('pay-sub-1')
    expect(lead?.paidAt).not.toBeNull()
    expect(payments.get('pay-sub-1')?.leadId).toBe(id)
    expect(events.some((e) => e.step === 'checkout_subscription')).toBe(true)

    // Grant ramificado: o members recebe a ASSINATURA (cria/estende com validade).
    const grant = gw.calls.grant[0]?.input as {
      subscription?: { subscriptionId: string; intervalMonths: number | null }
    }
    expect(grant.subscription).toEqual({ subscriptionId: 'sub-1', intervalMonths: 1 })
  })

  test('lead SEM telefone finaliza a assinatura pelo form (telefone vem do checkout, não 409)', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = subscriptionGateway()
    // Lead sem telefone (ex.: pré-checkout que não capturou o número). ANTES o handler
    // devolvia 409 "Telefone é obrigatório" e o form nem tinha o campo p/ corrigir.
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana Souza', email: 'ana@example.com' })

    const res = await startSubscription(req(cookieFor(id), SUB_CARD), deps(repo, gw))
    expect(res.status).toBe(200)

    // Telefone do FORM (fonte da verdade) grava no lead (mascarado, como o pré-checkout)...
    expect(leads.get(id)?.telefone).toBe('(11) 98888-7777')
    // ...e vai à Efí como dígitos, no customer da assinatura.
    const input = gw.calls.createSubscription[0]?.input as { customer: { phone: string } }
    expect(input.customer.phone).toBe('11988887777')
  })

  test('alternador: offerSlug da irmã ANUAL cobra a anual (12 meses)', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const res = await startSubscription(
      req(cookieFor(id), { ...SUB_CARD, offerSlug: ANNUAL }),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    const input = gw.calls.createSubscription[0]?.input as {
      amountInCents: number
      intervalMonths: number
    }
    expect(input.amountInCents).toBe(47000)
    expect(input.intervalMonths).toBe(12)
    expect(leads.get(id)?.offerRef).toBe(ANNUAL)
    expect(leads.get(id)?.subscriptionIntervalMonths).toBe(12)
  })

  test('offerSlug FORJADO (não é a irmã linkada) → 400 e nada é cobrado', async () => {
    const { repo } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const res = await startSubscription(
      req(cookieFor(id), { ...SUB_CARD, offerSlug: 'oferta-de-outra-pessoa' }),
      deps(repo, gw),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INVALID_OFFER')
    expect(gw.calls.createSubscription).toHaveLength(0)
  })

  test('oferta one_time → 409 NOT_SUBSCRIPTION', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway() // default: one_time
    const id = await readyLead(repo)

    const res = await startSubscription(req(cookieFor(id), SUB_CARD), deps(repo, gw))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_SUBSCRIPTION')
  })

  test('sem nascimento/endereço → 400 (a Efí exige o pagador completo)', async () => {
    const { repo } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const { birth: _b, ...noBirth } = SUB_CARD
    expect((await startSubscription(req(cookieFor(id), noBirth), deps(repo, gw))).status).toBe(400)
    const { address: _a, ...noAddress } = SUB_CARD
    expect((await startSubscription(req(cookieFor(id), noAddress), deps(repo, gw))).status).toBe(
      400,
    )
    expect(gw.calls.createSubscription).toHaveLength(0)
  })

  test('1ª cobrança PENDING (em análise) → não marca pago; polling/webhook fecham', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = subscriptionGateway()
    gw.setSubscriptionResult(201, {
      id: 'sub-1',
      status: 'PENDING',
      intervalMonths: 1,
      firstPayment: { id: 'pay-sub-1', status: 'PENDING' },
    })
    const id = await readyLead(repo)

    const res = await startSubscription(req(cookieFor(id), SUB_CARD), deps(repo, gw))
    expect(res.status).toBe(200)
    expect(leads.get(id)?.paidAt).toBeNull()
    expect(leads.get(id)?.subscriptionId).toBe('sub-1')
  })
})

describe('métodos por modo de oferta', () => {
  test('startCard recusa oferta de assinatura → 409 USE_SUBSCRIPTION', async () => {
    const { repo } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const res = await startCard(
      req(cookieFor(id), {
        token: 't',
        brand: 'visa',
        last4: '0087',
        installments: 1,
        attemptId: 'a1',
        contact: CONTACT,
      }),
      deps(repo, gw),
    )
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('USE_SUBSCRIPTION')
    expect(gw.calls.create).toHaveLength(0)
  })

  test('startPix em assinatura MENSAL → 409 SUBSCRIPTION_CARD_ONLY', async () => {
    const { repo } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const res = await startPix(req(cookieFor(id), { contact: CONTACT }), deps(repo, gw))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'SUBSCRIPTION_CARD_ONLY',
    )
  })

  test('startPix em assinatura ANUAL → cobra à vista e grava accessPeriodMonths 12', async () => {
    const { repo, payments } = createFakeRepo()
    const gw = subscriptionGateway()
    const id = await readyLead(repo)

    const res = await startPix(
      req(cookieFor(id), { contact: CONTACT, offerSlug: ANNUAL }),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    const input = gw.calls.create[0]?.input as { amountInCents: number; method: string }
    expect(input.method).toBe('PIX')
    expect(input.amountInCents).toBe(47000)
    expect(payments.get('pay-1')?.accessPeriodMonths).toBe(12)
  })

  test('cupom em assinatura anual à vista → 422 COUPON_NOT_ALLOWED', async () => {
    const { repo } = createFakeRepo()
    const gw = subscriptionGateway()
    gw.addCoupon('PROMO10', 1000)
    const id = await readyLead(repo)

    const res = await startPix(
      req(cookieFor(id), { contact: CONTACT, offerSlug: ANNUAL, couponCode: 'PROMO10' }),
      deps(repo, gw),
    )
    expect(res.status).toBe(422)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'COUPON_NOT_ALLOWED',
    )
    expect(gw.calls.create).toHaveLength(0)
  })
})

describe('grant ramificado (anual à vista)', () => {
  test('cobrança com accessPeriodMonths → grant leva accessPeriodMonths (sem subscription)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { buyerUserId: 'user-1', offerRef: ANNUAL })
    await repo.setPayment(id, 'pay-9', null, { offerRef: ANNUAL, accessPeriodMonths: 12 })
    await repo.markPaid(id, new Date())

    const grant = makeGrantMembers({
      gateway: gw.gateway,
      resolveOffer: () => ({ offerSlug: ANNUAL }),
      repo,
    })
    const lead = (await repo.getLead(id))!
    await grant(lead)

    const input = gw.calls.grant[0]?.input as {
      accessPeriodMonths?: number
      subscription?: unknown
    }
    expect(input.accessPeriodMonths).toBe(12)
    expect(input.subscription).toBeUndefined()
  })
})

describe('fiação do funil kids/comunidade-dos-criadores (env → mensal + irmã anual)', () => {
  // Exercita a cadeia REAL: lead com o funil novo → makeResolveOffer (registry +
  // env) → oferta mensal do catálogo → alternador pra irmã anual. A mecânica
  // genérica de assinatura já está coberta acima; aqui é a fiação do funil.
  const CDC_MENSAL = 'comunidade-dos-criadores-mensal'
  const CDC_ANUAL = 'comunidade-dos-criadores-anual'
  const cdcEnv = {
    offerByFunnel: {
      'pro/no-comando-da-ia': 'oferta-nci',
      'kids/comunidade-dos-criadores': CDC_MENSAL,
    },
  } as unknown as Env

  function cdcGateway() {
    const gw = createFakeGateway()
    gw.setOfferConfig(CDC_MENSAL, {
      priceCents: 9700,
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      altOffer: { slug: CDC_ANUAL, label: 'Economize no anual' },
    })
    gw.setOfferConfig(CDC_ANUAL, {
      priceCents: 79700,
      pricingMode: 'subscription',
      billingIntervalMonths: 12,
      altOffer: { slug: CDC_MENSAL },
    })
    return gw
  }

  function cdcDeps(
    repo: ReturnType<typeof createFakeRepo>['repo'],
    gw: ReturnType<typeof createFakeGateway>,
  ) {
    const resolveOffer = makeResolveOffer(cdcEnv)
    return {
      repo,
      gateway: gw.gateway,
      resolveOffer,
      fulfill: makeFulfill({ repo, gateway: gw.gateway }),
      grantMembers: makeGrantMembers({ gateway: gw.gateway, resolveOffer, repo }),
    }
  }

  async function cdcLead(repo: ReturnType<typeof createFakeRepo>['repo']) {
    const { id } = await repo.createLead('kids/comunidade-dos-criadores')
    await repo.updateLead(id, {
      nome: 'Ana Souza',
      email: 'ana@example.com',
      telefone: '11999998888',
    })
    return id
  }

  test('assinatura mensal: a env do funil resolve a oferta e cobra 9700 no intervalo 1', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = cdcGateway()
    const id = await cdcLead(repo)

    const res = await startSubscription(req(cookieFor(id), SUB_CARD), cdcDeps(repo, gw))
    expect(res.status).toBe(200)
    const input = gw.calls.createSubscription[0]?.input as {
      amountInCents: number
      intervalMonths: number
    }
    expect(input.amountInCents).toBe(9700)
    expect(input.intervalMonths).toBe(1)
    expect(leads.get(id)?.subscriptionIntervalMonths).toBe(1)
  })

  test('CTA do plano ANUAL (offerSlug da irmã) cobra 79700 no intervalo 12', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = cdcGateway()
    const id = await cdcLead(repo)

    const res = await startSubscription(
      req(cookieFor(id), { ...SUB_CARD, offerSlug: CDC_ANUAL }),
      cdcDeps(repo, gw),
    )
    expect(res.status).toBe(200)
    const input = gw.calls.createSubscription[0]?.input as {
      amountInCents: number
      intervalMonths: number
    }
    expect(input.amountInCents).toBe(79700)
    expect(input.intervalMonths).toBe(12)
    expect(leads.get(id)?.offerRef).toBe(CDC_ANUAL)
  })

  test('Pix no plano mensal → 409 SUBSCRIPTION_CARD_ONLY (só o anual tem à vista)', async () => {
    const { repo } = createFakeRepo()
    const gw = cdcGateway()
    const id = await cdcLead(repo)

    const res = await startPix(req(cookieFor(id), { contact: CONTACT }), cdcDeps(repo, gw))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'SUBSCRIPTION_CARD_ONLY',
    )
  })
})

describe('webhook: renovação de ciclo + falha de cobrança', () => {
  function webhookDeps(
    fake: ReturnType<typeof createFakeRepo>,
    gw: ReturnType<typeof createFakeGateway>,
  ) {
    const grantDeps = {
      gateway: gw.gateway,
      resolveOffer: () => ({ offerSlug: MONTHLY }),
      repo: fake.repo,
    }
    return {
      repo: fake.repo,
      internalToken: WEBHOOK_TOKEN,
      fulfill: makeFulfill({ repo: fake.repo, gateway: gw.gateway }),
      grantMembers: makeGrantMembers(grantDeps),
      extendMembersForCycle: makeExtendMembersForCycle(grantDeps),
      sendChargeFailed: makeSendChargeFailed({
        gateway: gw.gateway,
        communityUrl: 'https://app.example',
      }),
    }
  }

  function whReq(body: unknown, deliveryId = 'd-1'): Request {
    return new Request('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': WEBHOOK_TOKEN,
        'x-delivery-id': deliveryId,
      },
      body: JSON.stringify(body),
    })
  }

  /** Lead JÁ pago com assinatura ativa (1º ciclo `pay-sub-1` no histórico). */
  async function paidSubscriber(fake: ReturnType<typeof createFakeRepo>) {
    const { id } = await fake.repo.createLead()
    await fake.repo.updateLead(id, {
      nome: 'Ana Souza',
      email: 'ana@example.com',
      telefone: '11999998888',
      offerRef: MONTHLY,
      buyerUserId: 'user-1',
      buyerIsNew: false,
      buyerRegisteredAt: new Date(),
      welcomeSentAt: new Date(),
      membersGrantedAt: new Date(),
    })
    await fake.repo.setSubscription(id, 'sub-1', 1)
    await fake.repo.setPayment(id, 'pay-sub-1', null, { offerRef: MONTHLY })
    await fake.repo.markPaid(id, new Date('2026-06-01T12:00:00Z'))
    return id
  }

  test('ciclo de RENOVAÇÃO: estende no members com o paidAt do ciclo, sem welcome', async () => {
    const fake = createFakeRepo()
    const gw = createFakeGateway()
    const id = await paidSubscriber(fake)

    const res = await handlePaymentWebhook(
      whReq({
        event: 'payment.paid',
        data: {
          paymentId: 'pay-cycle-2',
          subscriptionId: 'sub-1',
          paidAt: '2026-07-01T12:00:00Z',
        },
      }),
      webhookDeps(fake, gw),
    )
    expect(res.status).toBe(200)
    expect(((await res.json()) as { renewal?: boolean }).renewal).toBe(true)

    // Extensão: grant com a assinatura + o paidAt do CICLO (não o da 1ª compra).
    const grant = gw.calls.grant[0]?.input as {
      paymentId: string
      paidAt?: string
      subscription?: { subscriptionId: string }
    }
    expect(grant.paymentId).toBe('pay-cycle-2')
    expect(grant.paidAt).toBe('2026-07-01T12:00:00Z')
    expect(grant.subscription?.subscriptionId).toBe('sub-1')

    // Ciclo linkado ao histórico; NADA de welcome/fulfill re-disparado.
    expect(fake.payments.get('pay-cycle-2')?.leadId).toBe(id)
    expect(gw.calls.messages).toHaveLength(0)
    expect(gw.calls.ensureBuyer).toHaveLength(0)
    expect(fake.processed.has('d-1')).toBe(true)
  })

  test('extend falhou → 502 GRANT_RETRY sem marcar a entrega (gateway re-entrega)', async () => {
    const fake = createFakeRepo()
    const gw = createFakeGateway()
    gw.setGrantStatus(502)
    await paidSubscriber(fake)

    const res = await handlePaymentWebhook(
      whReq({ event: 'payment.paid', data: { paymentId: 'pay-cycle-2', subscriptionId: 'sub-1' } }),
      webhookDeps(fake, gw),
    )
    expect(res.status).toBe(502)
    expect(fake.processed.has('d-1')).toBe(false)

    // Reentrega após o fix: o ciclo JÁ está no histórico → ainda é renovação.
    gw.setGrantStatus(200)
    const retry = await handlePaymentWebhook(
      whReq({ event: 'payment.paid', data: { paymentId: 'pay-cycle-2', subscriptionId: 'sub-1' } }),
      webhookDeps(fake, gw),
    )
    expect(retry.status).toBe(200)
    expect(((await retry.json()) as { renewal?: boolean }).renewal).toBe(true)
    expect(fake.processed.has('d-1')).toBe(true)
  })

  test('reentrega da 1ª cobrança (mesmo paymentId) segue o fluxo normal (backstop), não renovação', async () => {
    const fake = createFakeRepo()
    const gw = createFakeGateway()
    await paidSubscriber(fake)

    const res = await handlePaymentWebhook(
      whReq({ event: 'payment.paid', data: { paymentId: 'pay-sub-1', subscriptionId: 'sub-1' } }),
      webhookDeps(fake, gw),
    )
    expect(res.status).toBe(200)
    expect(((await res.json()) as { renewal?: boolean }).renewal).toBeUndefined()
  })

  test('resposta da criação PERDIDA: 1ª cobrança resolve pela assinatura e paga o lead', async () => {
    const fake = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await fake.repo.createLead()
    await fake.repo.updateLead(id, {
      nome: 'Ana Souza',
      email: 'ana@example.com',
      telefone: '11999998888',
      offerRef: MONTHLY,
    })
    // setSubscription persistiu mas o setPayment/markPaid não (crash no meio).
    await fake.repo.setSubscription(id, 'sub-1', 1)

    const res = await handlePaymentWebhook(
      whReq({ event: 'payment.paid', data: { paymentId: 'pay-sub-1', subscriptionId: 'sub-1' } }),
      webhookDeps(fake, gw),
    )
    expect(res.status).toBe(200)
    const lead = fake.leads.get(id)
    expect(lead?.paidAt).not.toBeNull()
    expect(lead?.paymentId).toBe('pay-sub-1')
    // Fluxo NORMAL de 1ª compra: comprador registrado + grant de assinatura.
    expect(gw.calls.ensureBuyer).toHaveLength(1)
    const grant = gw.calls.grant[0]?.input as { subscription?: { subscriptionId: string } }
    expect(grant.subscription?.subscriptionId).toBe('sub-1')
  })

  test('payment.failed com subscriptionId → dunning idempotente por cobrança', async () => {
    const fake = createFakeRepo()
    const gw = createFakeGateway()
    await paidSubscriber(fake)

    const res = await handlePaymentWebhook(
      whReq({
        event: 'payment.failed',
        data: { paymentId: 'pay-cycle-3', subscriptionId: 'sub-1' },
      }),
      webhookDeps(fake, gw),
    )
    expect(res.status).toBe(200)
    expect(fake.processed.has('d-1')).toBe(true)

    const email = gw.calls.messages.find((m) => m.input.channel === 'email')
    expect(email?.input.templateKey).toBe('subscription-charge-failed')
    expect(email?.idempotencyKey).toBe('dunning-pay-cycle-3')
    // WhatsApp também sai (telefone BR válido no lead).
    const wa = gw.calls.messages.find((m) => m.input.channel === 'whatsapp')
    expect(wa?.idempotencyKey).toBe('dunning-wa-pay-cycle-3')
  })

  test('payment.failed de assinatura desconhecida → 200 (nada a fazer), entrega marcada', async () => {
    const fake = createFakeRepo()
    const gw = createFakeGateway()
    const res = await handlePaymentWebhook(
      whReq({ event: 'payment.failed', data: { paymentId: 'pay-x', subscriptionId: 'sub-???' } }),
      webhookDeps(fake, gw),
    )
    expect(res.status).toBe(200)
    expect(gw.calls.messages).toHaveLength(0)
    expect(fake.processed.has('d-1')).toBe(true)
  })
})
