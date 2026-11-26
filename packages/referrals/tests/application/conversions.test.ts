import { beforeEach, describe, expect, test } from 'bun:test'
import type { GiftAudience } from '@sistemazero/core/referrals'
import {
  type RecordConversionConfig,
  RecordConversionService,
} from '../../src/application/conversions/record-conversion.service'
import { SweepConversionsService } from '../../src/application/conversions/sweep-conversions.service'
import { giftAcquisition } from '../../src/domain/acquisition'
import type {
  CatalogClient,
  OfferSnapshot,
  PaymentSnapshot,
  PaymentsClient,
} from '../../src/domain/ports/clients.port'
import type { SendEmailInput } from '../../src/domain/ports/gateway.port'
import type { RedemptionRecord } from '../../src/domain/ports/referral-repository.port'
import { InMemoryAcquisitionRepository } from '../fakes/acquisitions'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const CONFIG: RecordConversionConfig = {
  conversionOfferSlugs: ['comunidade-dos-criadores-mensal', 'comunidade-dos-criadores-anual'],
  bonusAmountCents: 3000,
  bonusAmounts: { monthly: 3000, annual: 8000 },
  bonusWindowDays: 45,
  matureHours: 180,
}
const DEFAULTS = { amounts: CONFIG.bonusAmounts ?? null, legacyCents: 3000, windowDays: 45 }
const DAY = 86_400_000

class FakePaymentsClient implements PaymentsClient {
  byId = new Map<string, PaymentSnapshot>()
  fail = false
  subscriptionCreatedAt: Date | null = new Date('2026-09-01T11:00:00Z')
  async getSubscriptionCreatedAt() {
    if (this.fail) throw new Error('ECONNREFUSED')
    return this.subscriptionCreatedAt
  }
  async getPayment(paymentId: string): Promise<PaymentSnapshot | null> {
    if (this.fail) throw new Error('ECONNREFUSED')
    return this.byId.get(paymentId) ?? null
  }
  /** Ofertas já pagas por e-mail (o histórico de antes da origem por aquisição). */
  paidOffers = new Map<string, string[]>()
  failPaidOffers = false
  async listPaidOfferIds(input: { email: string }) {
    if (this.fail || this.failPaidOffers) throw new Error('ECONNREFUSED')
    return this.paidOffers.get(input.email) ?? []
  }
}

class FakeCatalogClient implements CatalogClient {
  byId = new Map<string, OfferSnapshot>()
  fail = false
  calls = 0
  async getOfferById(offerId: string): Promise<OfferSnapshot | null> {
    this.calls++
    if (this.fail) throw new Error('ECONNREFUSED')
    return this.byId.get(offerId) ?? null
  }
}

const PAID_AT = new Date('2026-09-01T12:00:00.000Z')

function paymentSnapshot(overrides: Partial<PaymentSnapshot> = {}): PaymentSnapshot {
  return {
    id: 'pay-1',
    status: 'PAID',
    amountInCents: 9700n,
    paidAt: PAID_AT,
    customer: { name: 'Paula Prado', email: 'Paula@Example.com' },
    metadata: { offerId: '0ffe0000-0000-4000-8000-000000000001', billingAudience: 'kids' },
    subscriptionId: 'sub-1',
    ...overrides,
  }
}

describe('RecordConversionService', () => {
  let repo: InMemoryReferralRepository
  let acquisitions: InMemoryAcquisitionRepository
  let campaigns: InMemoryCampaignRepository
  let payments: FakePaymentsClient
  let catalog: FakeCatalogClient
  let service: RecordConversionService

  async function ambassador(name = 'Vó Cida', email = 'cida@example.com', code = 'cida-x7k2') {
    const created = await repo.createAmbassadorWithCode({
      name,
      email,
      pageToken: `${code}-${'t'.repeat(40)}`.slice(0, 43),
      code,
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    return created
  }

  /**
   * Um presente concluído de paula@example.com, gravado como aquisição como o resgate faz.
   * `tweak` muda o resgate ANTES da aquisição (o acordo é capturado nela).
   */
  async function seedGift(
    opts: {
      daysBefore?: number
      tweak?: (r: RedemptionRecord) => void
      seller?: Awaited<ReturnType<typeof ambassador>>
      audience?: GiftAudience
    } = {},
  ) {
    const seller = opts.seller ?? (await ambassador())
    const { redemption } = await repo.insertRedemption({
      audience: opts.audience ?? 'kids',
      codeId: seller.code.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, PAID_AT)
    redemption.createdAt = new Date(PAID_AT.getTime() - (opts.daysBefore ?? 1) * DAY)
    redemption.bonusAmounts = { monthly: 3000, annual: 8000 }
    opts.tweak?.(redemption)
    const code = repo.codes.find((c) => c.id === redemption.codeId)!
    await acquisitions.insert(giftAcquisition(redemption, code, redemption.createdAt, DEFAULTS))
    return { ...seller, redemption }
  }

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    acquisitions = new InMemoryAcquisitionRepository(repo)
    campaigns = new InMemoryCampaignRepository(repo)
    payments = new FakePaymentsClient()
    catalog = new FakeCatalogClient()
    catalog.byId.set('0ffe0000-0000-4000-8000-000000000001', {
      id: '0ffe0000-0000-4000-8000-000000000001',
      slug: 'comunidade-dos-criadores-mensal',
      name: 'Comunidade (mensal)',
      billingIntervalMonths: 1,
      audience: 'kids',
    })
    catalog.byId.set('0ffe0000-0000-4000-8000-0000000000de', {
      id: '0ffe0000-0000-4000-8000-0000000000de',
      slug: 'desafio-primeiro-jogo-30-dias',
      name: 'Desafio',
      audience: 'kids',
    })
    payments.byId.set('pay-1', paymentSnapshot())
    service = new RecordConversionService(
      repo,
      acquisitions,
      campaigns,
      payments,
      catalog,
      CONFIG,
      silentLogger,
    )
  })

  const paidDelivery = (paymentId = 'pay-1') => ({
    deliveryId: `d-${paymentId}`,
    eventName: 'payment.paid',
    payload: { paymentId },
  })
  const refund = (paymentId = 'pay-1') => ({
    deliveryId: `r-${paymentId}`,
    eventName: 'payment.refunded',
    payload: { paymentId },
  })

  test.each([
    false,
    true,
  ])('estorno antes do INSERT não deixa compra avulsa ativa (com embaixador: %s)', async (withAmbassador) => {
    if (withAmbassador) await seedGift()
    payments.byId.set(
      'pay-1',
      paymentSnapshot({
        subscriptionId: null,
        metadata: { offerId: '0ffe0000-0000-4000-8000-0000000000de', billingAudience: 'kids' },
      }),
    )
    const insert = acquisitions.insert.bind(acquisitions)
    acquisitions.insert = async (input) => {
      // A entrega do estorno termina depois da leitura PAID e antes da aquisição existir.
      payments.byId.set('pay-1', { ...payments.byId.get('pay-1')!, status: 'REFUNDED' })
      expect((await service.execute(refund())).kind).toBe('ok')
      expect(await acquisitions.findByPayment('pay-1')).toBeNull()
      return insert(input)
    }

    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(await acquisitions.findByPayment('pay-1')).toMatchObject({ status: 'refunded' })
    expect(repo.conversions).toHaveLength(0)
  })

  test.each([
    1, 12,
  ])('presente pessoal + assinatura no ciclo %s: bônus do acordo aceito', async (cycle) => {
    await seedGift()
    catalog.byId.get('0ffe0000-0000-4000-8000-000000000001')!.billingIntervalMonths = cycle
    payments.byId.get('pay-1')!.amountInCents = 1000n
    await service.execute(paidDelivery())
    await service.execute(paidDelivery())
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]).toMatchObject({
      bonusCents: cycle === 12 ? 8000 : 3000,
      status: 'pending',
      subscriberEmail: 'paula@example.com',
      audience: 'kids',
    })
    // A assinatura também virou aquisição, com o valor pago.
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-1')).toMatchObject({
      kind: 'subscription',
      amountCents: 1000n,
      offerSlug: 'comunidade-dos-criadores-mensal',
    })
  })

  test.each([
    1, 12,
  ])('campanha por ciclo %s conserva os dois valores do snapshot', async (cycle) => {
    const seller = await ambassador()
    await seedGift({
      seller,
      tweak: (r) => {
        const code = repo.codes.find((c) => c.id === r.codeId)!
        code.ownerKind = 'campaign'
        r.campaignReferral = {
          ambassadorId: seller.ambassador.id,
          ambassadorName: seller.ambassador.name,
          ambassadorEmail: seller.ambassador.email,
          commissionEnabled: true,
          commissionAmountCents: 3500,
          commissionAnnualAmountCents: 8500,
          commissionWindowDays: 30,
        }
      },
    })
    catalog.byId.get('0ffe0000-0000-4000-8000-000000000001')!.billingIntervalMonths = cycle
    await service.execute(paidDelivery())
    expect(repo.conversions[0]!.bonusCents).toBe(cycle === 12 ? 8500 : 3500)
  })

  test('ciclo desconhecido em acordo por plano retoma sem presumir um bônus', async () => {
    await seedGift()
    catalog.byId.get('0ffe0000-0000-4000-8000-000000000001')!.billingIntervalMonths = null
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    expect(repo.conversions).toHaveLength(0)
    catalog.byId.get('0ffe0000-0000-4000-8000-000000000001')!.billingIntervalMonths = 12
    await service.execute(paidDelivery())
    expect(repo.conversions[0]!.bonusCents).toBe(8000)
  })

  test('aceite direto legado (sem valores por plano) mantém o bônus único no anual', async () => {
    await seedGift({ tweak: (r) => (r.bonusAmounts = null) })
    catalog.byId.get('0ffe0000-0000-4000-8000-000000000001')!.billingIntervalMonths = 12
    await service.execute(paidDelivery())
    expect(repo.conversions[0]!.bonusCents).toBe(3000)
  })

  test.each([
    true,
    false,
  ])('campanha com embaixador e comissão %s: atribui, paga só com comissão', async (enabled) => {
    const seller = await ambassador()
    await seedGift({
      seller,
      tweak: (r) => {
        const code = repo.codes.find((c) => c.id === r.codeId)!
        code.ownerKind = 'campaign'
        code.ambassadorId = null
        code.ownerEmail = null
        r.campaignReferral = {
          ambassadorId: seller.ambassador.id,
          ambassadorName: seller.ambassador.name,
          ambassadorEmail: seller.ambassador.email,
          commissionEnabled: enabled,
          commissionAmountCents: enabled ? 4500 : null,
          commissionWindowDays: enabled ? 30 : null,
        }
      },
    })
    await service.execute(paidDelivery())
    await service.execute(paidDelivery())
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]).toMatchObject({
      ambassadorId: seller.ambassador.id,
      bonusCents: enabled ? 4500 : 0,
      status: enabled ? 'pending' : 'unrewarded',
    })
    expect((await repo.listConversions({ audience: 'kids', limit: 25, offset: 0 })).total).toBe(
      enabled ? 1 : 0,
    )
  })

  test('autoindicação: o embaixador assina com o próprio e-mail → self_blocked, bônus 0', async () => {
    const seller = await ambassador('Paula Prado', 'paula@example.com', 'paula-x7k2')
    await seedGift({ seller })
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions[0]).toMatchObject({ status: 'self_blocked', bonusCents: 0 })
  })

  test('autoindicação pela CONTA: o embaixador paga com outro e-mail → self_blocked', async () => {
    const seller = await ambassador()
    repo.ambassadors.find((a) => a.id === seller.ambassador.id)!.accountUserId = 'conta-cida'
    await seedGift({ seller })
    payments.byId.get('pay-1')!.metadata.accountUserId = 'conta-cida'
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions[0]).toMatchObject({ status: 'self_blocked', bonusCents: 0 })
  })

  test('primeira assinatura só: quem já assinou antes (aquisição) não rende bônus', async () => {
    await seedGift()
    await acquisitions.insert({
      email: 'paula@example.com',
      accountUserId: null,
      audience: 'kids',
      kind: 'subscription',
      offerId: '0ffe0000-0000-4000-8000-000000000001',
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      paymentId: 'pay-antiga',
      subscriptionId: 'sub-antiga',
      redemptionId: null,
      acquiredAt: new Date(PAID_AT.getTime() - 200 * DAY),
      originKind: 'none',
      codeId: null,
      campaignId: null,
      ambassadorId: null,
      place: null,
      utm: null,
      bonusTerms: null,
    })
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
    // A assinatura nova continua sendo uma aquisição (conta nos resultados).
    expect(acquisitions.items.some((a) => a.paymentId === 'pay-1')).toBe(true)
  })

  test('primeira assinatura só: o histórico de antes da 0013 vem do payments', async () => {
    await seedGift()
    payments.paidOffers.set('paula@example.com', [
      '0ffe0000-0000-4000-8000-0000000000de',
      '0ffe0000-0000-4000-8000-000000000001',
    ])
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
  })

  test('histórico de compras fora do ar: a entrega volta, sem bônus presumido', async () => {
    await seedGift()
    payments.failPaidOffers = true
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    expect(repo.conversions).toHaveLength(0)
    payments.failPaidOffers = false
    payments.paidOffers.set('paula@example.com', ['0ffe0000-0000-4000-8000-0000000000de'])
    await service.execute(paidDelivery())
    expect(repo.conversions[0]).toMatchObject({ status: 'pending', bonusCents: 3000 })
  })

  test('mesma conta, outro e-mail com conversão ativa: a vaga da conta já foi usada', async () => {
    const seller = await ambassador()
    await seedGift({ seller, tweak: (r) => (r.userId = 'conta-paula') })
    await repo.insertConversion({
      redemptionId: null,
      subscriberEmail: 'paula.trabalho@example.com',
      audience: 'kids',
      codeId: seller.code.id,
      ambassadorId: seller.ambassador.id,
      paymentId: 'pay-outro-email',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(PAID_AT.getTime() - DAY),
      maturesAt: PAID_AT,
    })
    acquisitions.items.find((a) => a.kind === 'gift')!.accountUserId = 'conta-paula'
    acquisitions.items.find((a) => a.kind === 'gift')!.email = 'paula.trabalho@example.com'
    payments.byId.get('pay-1')!.metadata.accountUserId = 'conta-paula'
    await service.execute(paidDelivery())
    expect(repo.conversions.filter((c) => c.paymentId === 'pay-1')).toHaveLength(0)
  })

  test('fora do prazo de 45 dias do link pessoal: conta como venda, sem bônus', async () => {
    await seedGift({ daysBefore: 46 })
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
    expect(acquisitions.items.some((a) => a.paymentId === 'pay-1')).toBe(true)
  })

  test('dois embaixadores no prazo: o bônus é do PRIMEIRO; o primeiro fora do prazo cede', async () => {
    const mariana = await ambassador('Mariana Lopes', 'mariana@example.com', 'mari-x7k2')
    const rafael = await ambassador('Rafael Souza', 'rafael@example.com', 'rafa-p3m9')
    // Mariana vendeu o Desafio há 30 dias pelo link dela; Rafael deu um presente há 10.
    await acquisitions.insert({
      email: 'paula@example.com',
      accountUserId: null,
      audience: 'kids',
      kind: 'one_time',
      offerId: '0ffe0000-0000-4000-8000-0000000000de',
      amountCents: 6700n,
      paymentId: 'pay-desafio',
      subscriptionId: null,
      redemptionId: null,
      acquiredAt: new Date(PAID_AT.getTime() - 30 * DAY),
      originKind: 'ambassador',
      codeId: mariana.code.id,
      campaignId: null,
      ambassadorId: mariana.ambassador.id,
      place: null,
      utm: null,
      bonusTerms: {
        ambassadorId: mariana.ambassador.id,
        ambassadorEmail: 'mariana@example.com',
        enabled: true,
        monthlyCents: 3000,
        annualCents: 8000,
        fixedCents: null,
        windowDays: 45,
      },
    })
    await seedGift({ seller: rafael, daysBefore: 10 })
    await service.execute(paidDelivery())
    expect(repo.conversions[0]!.ambassadorId).toBe(mariana.ambassador.id)

    // Se a da Mariana tivesse 3 meses (fora do prazo), o bônus seria do Rafael.
    repo.conversions.length = 0
    acquisitions.items.find((a) => a.paymentId === 'pay-desafio')!.acquiredAt = new Date(
      PAID_AT.getTime() - 90 * DAY,
    )
    acquisitions.items.splice(
      acquisitions.items.findIndex((a) => a.paymentId === 'pay-1'),
      1,
    )
    await service.execute(paidDelivery())
    expect(repo.conversions[0]!.ambassadorId).toBe(rafael.ambassador.id)
  })

  test('venda pelo link, SEM presente: a assinatura direta rende bônus ao embaixador', async () => {
    const seller = await ambassador()
    payments.byId.set(
      'pay-1',
      paymentSnapshot({
        metadata: {
          offerId: '0ffe0000-0000-4000-8000-000000000001',
          billingAudience: 'kids',
          origemCodigo: 'CIDA-X7K2',
        },
      }),
    )
    payments.subscriptionCreatedAt = new Date(PAID_AT.getTime() - 60_000)
    await service.execute(paidDelivery())
    expect(acquisitions.items[0]).toMatchObject({
      originKind: 'ambassador',
      ambassadorId: seller.ambassador.id,
      codeId: seller.code.id,
    })
    expect(repo.conversions[0]).toMatchObject({
      redemptionId: null,
      acquisitionId: acquisitions.items[0]!.id,
      bonusCents: 3000,
      status: 'pending',
    })
  })

  test('curso comprado pelo link só marca a origem; a assinatura depois rende o bônus', async () => {
    const seller = await ambassador()
    payments.byId.set(
      'pay-desafio',
      paymentSnapshot({
        id: 'pay-desafio',
        subscriptionId: null,
        amountInCents: 6700n,
        paidAt: new Date(PAID_AT.getTime() - 5 * DAY),
        metadata: {
          offerId: '0ffe0000-0000-4000-8000-0000000000de',
          billingAudience: 'kids',
          origemCodigo: 'cida-x7k2',
        },
      }),
    )
    await service.execute(paidDelivery('pay-desafio'))
    expect(repo.conversions).toHaveLength(0)
    expect(acquisitions.items[0]).toMatchObject({ kind: 'one_time', originKind: 'ambassador' })
    // Assinou sozinha 5 dias depois (sem link): o embaixador do curso ganha o bônus.
    await service.execute(paidDelivery())
    expect(repo.conversions[0]!.ambassadorId).toBe(seller.ambassador.id)
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-1')?.originKind).toBe('none')
  })

  test('compra sem indicação: aquisição registrada sem consultar o catálogo', async () => {
    catalog.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
    expect(acquisitions.items[0]).toMatchObject({ originKind: 'none', offerSlug: null })
    expect(catalog.calls).toBe(0)
  })

  test('oferta que não é uuid (outro produtor no fan-out) é consumida sem aquisição', async () => {
    payments.byId.set(
      'pay-x',
      paymentSnapshot({
        id: 'pay-x',
        metadata: { offerId: 'nao-e-uuid', billingAudience: 'kids' },
      }),
    )
    const delivery = { ...paidDelivery(), payload: { paymentId: 'pay-x' } }
    expect((await service.execute(delivery)).kind).toBe('ok')
    expect(acquisitions.items).toHaveLength(0)
  })

  test('botão da plataforma e fonte de mídia viram a origem da compra', async () => {
    payments.byId.set(
      'pay-2',
      paymentSnapshot({
        id: 'pay-2',
        subscriptionId: null,
        metadata: {
          offerId: '0ffe0000-0000-4000-8000-0000000000de',
          billingAudience: 'kids',
          origemLugar: 'pais-curso-fechado',
        },
      }),
    )
    payments.byId.set(
      'pay-3',
      paymentSnapshot({
        id: 'pay-3',
        subscriptionId: null,
        customer: { email: 'outra@example.com' },
        metadata: {
          offerId: '0ffe0000-0000-4000-8000-0000000000de',
          billingAudience: 'kids',
          origemFonte: 'instagram',
        },
      }),
    )
    await service.execute(paidDelivery('pay-2'))
    await service.execute(paidDelivery('pay-3'))
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-2')).toMatchObject({
      originKind: 'platform',
      place: 'pais-curso-fechado',
    })
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-3')).toMatchObject({
      originKind: 'ads',
      utm: { utmSource: 'instagram' },
    })
  })

  test('sem `billingAudience` o público vem do catálogo (e falha dele pede reentrega)', async () => {
    payments.byId.set(
      'pay-1',
      paymentSnapshot({ metadata: { offerId: '0ffe0000-0000-4000-8000-000000000001' } }),
    )
    catalog.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    catalog.fail = false
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(acquisitions.items[0]!.audience).toBe('kids')
  })

  test('renovação (outra cobrança da mesma assinatura) não vira aquisição nem bônus', async () => {
    await seedGift()
    await service.execute(paidDelivery())
    payments.byId.set(
      'pay-ciclo',
      paymentSnapshot({ id: 'pay-ciclo', paidAt: new Date(PAID_AT.getTime() + 30 * DAY) }),
    )
    expect((await service.execute(paidDelivery('pay-ciclo'))).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1)
    expect(acquisitions.items.some((a) => a.paymentId === 'pay-ciclo')).toBe(false)
  })

  test('renovação de assinatura anterior a 0013 (cobrança muito depois de criada) é ignorada', async () => {
    await seedGift()
    payments.subscriptionCreatedAt = new Date(PAID_AT.getTime() - 60 * DAY)
    expect(await service.execute(paidDelivery())).toEqual({ kind: 'ok' })
    expect(repo.conversions).toHaveLength(0)
    expect(acquisitions.items.some((a) => a.paymentId === 'pay-1')).toBe(false)
  })

  test('assinatura criada antes da entrada pelo embaixador não é dele', async () => {
    await seedGift()
    payments.subscriptionCreatedAt = new Date(PAID_AT.getTime() - 2 * DAY)
    expect(await service.execute(paidDelivery())).toEqual({ kind: 'ok' })
    expect(repo.conversions).toHaveLength(0)
  })

  test('data da assinatura indisponível pede reentrega e não inventa atribuição', async () => {
    await seedGift()
    payments.subscriptionCreatedAt = null
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    expect(repo.conversions).toHaveLength(0)
    payments.subscriptionCreatedAt = PAID_AT
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1)
  })

  test('anual à vista (SEM subscriptionId) também converte e vira assinatura', async () => {
    await seedGift()
    catalog.byId.set('0ffe0000-0000-4000-8000-000000000002', {
      id: '0ffe0000-0000-4000-8000-000000000002',
      slug: 'comunidade-dos-criadores-anual',
      name: 'Comunidade (anual)',
      billingIntervalMonths: 12,
    })
    payments.byId.set(
      'pay-2',
      paymentSnapshot({
        id: 'pay-2',
        subscriptionId: null,
        amountInCents: 97000n,
        metadata: { offerId: '0ffe0000-0000-4000-8000-000000000002', billingAudience: 'kids' },
      }),
    )
    expect((await service.execute(paidDelivery('pay-2'))).kind).toBe('ok')
    expect(repo.conversions[0]).toMatchObject({
      offerSlug: 'comunidade-dos-criadores-anual',
      bonusCents: 8000,
    })
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-2')!.kind).toBe('subscription')
  })

  test('oferta fora da allowlist (o Desafio) não vira conversão', async () => {
    await seedGift()
    payments.byId.set(
      'pay-1',
      paymentSnapshot({
        subscriptionId: null,
        metadata: { offerId: '0ffe0000-0000-4000-8000-0000000000de', billingAudience: 'kids' },
      }),
    )
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
  })

  test('falha ao conferir estorno após INSERT pede retry; reentrega estornada cancela', async () => {
    await seedGift()
    const originalGet = payments.getPayment.bind(payments)
    let calls = 0
    payments.getPayment = async (id) => {
      if (++calls === 2) throw new Error('Conexão caiu na conferência')
      return originalGet(id)
    }
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    expect(repo.conversions).toHaveLength(1)
    payments.byId.set('pay-1', paymentSnapshot({ status: 'REFUNDED' }))
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions[0]?.status).toBe('canceled')
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-1')?.status).toBe('refunded')
  })

  test('payments/catalog indisponíveis ou oferta 404 → retryable (quando há embaixador)', async () => {
    await seedGift()
    payments.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    payments.fail = false
    catalog.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    catalog.fail = false
    catalog.byId.delete('0ffe0000-0000-4000-8000-000000000001')
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    expect(repo.conversions).toHaveLength(0)
  })

  test('estorno na garantia cancela a pending e a aquisição; depois de elegível NÃO reverte', async () => {
    await seedGift()
    await service.execute(paidDelivery())
    expect((await service.execute(refund())).kind).toBe('ok')
    expect(repo.conversions[0]!.status).toBe('canceled')
    expect(acquisitions.items.find((a) => a.paymentId === 'pay-1')?.status).toBe('refunded')
    repo.conversions[0]!.status = 'eligible'
    expect((await service.execute(refund())).kind).toBe('ok')
    expect(repo.conversions[0]!.status).toBe('eligible')
  })

  test('alerta de "estorno após bônus" SÓ para eligible/paid', async () => {
    const errors: string[] = []
    const capturing = { ...silentLogger, error: (msg: string) => void errors.push(msg) }
    const svc = new RecordConversionService(
      repo,
      acquisitions,
      campaigns,
      payments,
      catalog,
      CONFIG,
      capturing,
    )
    await seedGift()
    await svc.execute(paidDelivery())
    repo.conversions[0]!.status = 'self_blocked'
    expect((await svc.execute(refund())).kind).toBe('ok')
    expect(errors).toHaveLength(0)
    repo.conversions[0]!.status = 'canceled'
    expect((await svc.execute(refund())).kind).toBe('ok')
    expect(errors).toHaveLength(0)
    repo.conversions[0]!.status = 'eligible'
    expect((await svc.execute(refund())).kind).toBe('ok')
    expect(errors).toEqual(['referrals.refund_after_bonus_eligible'])
  })

  test('estornou na garantia e assinou de novo no prazo → converte de novo', async () => {
    await seedGift()
    await service.execute(paidDelivery())
    await service.execute(refund())
    expect(repo.conversions[0]!.status).toBe('canceled')
    payments.byId.set('pay-volta', paymentSnapshot({ id: 'pay-volta', subscriptionId: 'sub-2' }))
    expect((await service.execute(paidDelivery('pay-volta'))).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(2)
    expect(repo.conversions[1]).toMatchObject({ status: 'pending', paymentId: 'pay-volta' })
  })

  test('uma primeira assinatura por pessoa e público: outra assinatura não paga de novo', async () => {
    await seedGift()
    await service.execute(paidDelivery())
    payments.byId.set('pay-outra', paymentSnapshot({ id: 'pay-outra', subscriptionId: 'sub-3' }))
    await service.execute(paidDelivery('pay-outra'))
    expect(repo.conversions.filter((c) => c.status === 'pending')).toHaveLength(1)
  })
})

describe('SweepConversionsService', () => {
  test('matura as vencidas e avisa o embaixador com o valor formatado', async () => {
    const repo = new InMemoryReferralRepository()
    const gateway = new FakeReferralsGateway()
    const sweep = new SweepConversionsService(
      repo,
      gateway,
      { funnelPublicUrl: 'https://sistemazero.com.br', batchSize: 50 },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 'T'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: created.code.id,
      email: 'paula@example.com',
      name: 'Paula',
      phone: null,
    })
    await repo.insertConversion({
      redemptionId: redemption.id,
      subscriberEmail: redemption.email,
      audience: redemption.audience,
      codeId: created.code.id,
      ambassadorId: created.ambassador.id,
      paymentId: 'pay-1',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(Date.now() - 200 * 3600_000),
      maturesAt: new Date(Date.now() - 20 * 3600_000), // já madura
    })

    expect(await sweep.mature()).toBe(1)
    expect(repo.conversions[0]!.status).toBe('eligible')

    expect(await sweep.notify()).toBe(1)
    expect(repo.conversions[0]!.notifiedAt).not.toBeNull()
    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-bonus-eligible')
    expect(email.variables.valor).toBe('R$ 30,00')
    expect(email.variables.link).toBe(`https://sistemazero.com.br/embaixador/${'T'.repeat(43)}`)
    expect(send.idempotencyKey).toBe(`bonus-eligible:${repo.conversions[0]!.id}`)

    // 2ª volta: nada a maturar nem avisar.
    expect(await sweep.mature()).toBe(0)
    expect(await sweep.notify()).toBe(0)
  })

  test('falha no envio NÃO marca notificado (retoma no próximo ciclo)', async () => {
    const repo = new InMemoryReferralRepository()
    const gateway = new FakeReferralsGateway()
    gateway.sendEmailResult = { status: 502, body: {} }
    const sweep = new SweepConversionsService(
      repo,
      gateway,
      { funnelPublicUrl: 'https://x.com', batchSize: 50 },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 't'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: created.code.id,
      email: 'p@x.com',
      name: 'P',
      phone: null,
    })
    await repo.insertConversion({
      redemptionId: redemption.id,
      subscriberEmail: redemption.email,
      audience: redemption.audience,
      codeId: created.code.id,
      ambassadorId: created.ambassador.id,
      paymentId: 'pay-1',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(),
      maturesAt: new Date(Date.now() - 1000),
    })
    await sweep.mature()
    expect(await sweep.notify()).toBe(0)
    expect(repo.conversions[0]!.notifiedAt).toBeNull()

    gateway.sendEmailResult = { status: 202, body: {} }
    expect(await sweep.notify()).toBe(1)
  })

  test('embaixador DESATIVADO não recebe o aviso (a página 404aria); reativado → próximo ciclo envia', async () => {
    const repo = new InMemoryReferralRepository()
    const gateway = new FakeReferralsGateway()
    const sweep = new SweepConversionsService(
      repo,
      gateway,
      { funnelPublicUrl: 'https://x.com', batchSize: 50 },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 't'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: created.code.id,
      email: 'p@x.com',
      name: 'P',
      phone: null,
    })
    await repo.insertConversion({
      redemptionId: redemption.id,
      subscriberEmail: redemption.email,
      audience: redemption.audience,
      codeId: created.code.id,
      ambassadorId: created.ambassador.id,
      paymentId: 'pay-1',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(),
      maturesAt: new Date(Date.now() - 1000),
    })
    await repo.setAmbassadorStatus(created.ambassador.id, 'disabled')
    await sweep.mature()
    // Desativado: nada sai e a notificação NÃO é queimada (mark-after-send).
    expect(await sweep.notify()).toBe(0)
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
    expect(repo.conversions[0]!.notifiedAt).toBeNull()

    await repo.setAmbassadorStatus(created.ambassador.id, 'active')
    expect(await sweep.notify()).toBe(1)
    expect(repo.conversions[0]!.notifiedAt).not.toBeNull()
  })
})
