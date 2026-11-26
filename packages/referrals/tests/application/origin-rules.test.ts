import { describe, expect, test } from 'bun:test'
import { AcquisitionMaintenanceService } from '../../src/application/acquisitions/acquisition-maintenance.service'
import { RecordConversionService } from '../../src/application/conversions/record-conversion.service'
import type { OfferSnapshot, PaymentSnapshot } from '../../src/domain/ports/clients.port'
import { InMemoryAcquisitionRepository } from '../fakes/acquisitions'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import { InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const DAY = 86_400_000
const PAID_AT = new Date('2026-12-10T12:00:00.000Z')
const DEFAULTS = { amounts: { monthly: 3000, annual: 8000 }, legacyCents: 3000, windowDays: 45 }
const COMMUNITY: OfferSnapshot = {
  id: '0ffe0000-0000-4000-8000-0000000000c0',
  slug: 'comunidade-dos-criadores-mensal',
  name: 'Comunidade',
  billingIntervalMonths: 1,
  audience: 'kids',
}

function setup(opts: { legacyBefore?: Date | null } = {}) {
  const repo = new InMemoryReferralRepository()
  const acquisitions = new InMemoryAcquisitionRepository(repo)
  const payments = new Map<string, PaymentSnapshot>()
  let getPaymentCalls = 0
  const offers = new Map<string, OfferSnapshot>([[COMMUNITY.id, COMMUNITY]])
  const catalog = {
    getOfferById: async (id: string) => offers.get(id) ?? null,
  }
  const maintenance = new AcquisitionMaintenanceService(
    acquisitions,
    catalog,
    {
      defaults: DEFAULTS,
      repairWindowDays: 3650,
      batchSize: 2,
      conversionOfferSlugs: [COMMUNITY.slug],
      legacyBefore: opts.legacyBefore,
    },
    silentLogger,
    () => PAID_AT,
  )
  const service = new RecordConversionService(
    repo,
    acquisitions,
    new InMemoryCampaignRepository(repo),
    {
      getPayment: async (id) => {
        getPaymentCalls++
        return payments.get(id) ?? null
      },
      getSubscriptionCreatedAt: async () => new Date(PAID_AT.getTime() - 60_000),
      listPaidOfferIds: async () => [],
    },
    catalog,
    {
      conversionOfferSlugs: [COMMUNITY.slug],
      bonusAmountCents: 3000,
      bonusAmounts: DEFAULTS.amounts,
      bonusWindowDays: 45,
      matureHours: 180,
    },
    silentLogger,
    maintenance,
  )
  const pay = (id: string, overrides: Partial<PaymentSnapshot> = {}) => {
    payments.set(id, {
      id,
      status: 'PAID',
      amountInCents: 9700n,
      paidAt: PAID_AT,
      customer: { email: 'paula@example.com' },
      metadata: { offerId: COMMUNITY.id, billingAudience: 'kids' },
      subscriptionId: `sub-${id}`,
      ...overrides,
    })
    return service.execute({
      deliveryId: `d-${id}`,
      eventName: 'payment.paid',
      payload: { paymentId: id },
    })
  }
  return {
    repo,
    acquisitions,
    maintenance,
    offers,
    pay,
    get getPaymentCalls() {
      return getPaymentCalls
    },
  }
}

async function giftWithoutAcquisition(
  repo: InMemoryReferralRepository,
  completedDaysBefore: number,
  email = 'paula@example.com',
) {
  const created = await repo.createAmbassadorWithCode({
    name: 'Vó Cida',
    email: 'cida@example.com',
    pageToken: 'c'.repeat(43),
    code: 'cida-x7k2',
  })
  if (created.kind !== 'created') throw new Error('seed')
  const { redemption } = await repo.insertRedemption({
    audience: 'kids',
    codeId: created.code.id,
    email,
    name: 'Paula',
    phone: null,
  })
  const at = new Date(PAID_AT.getTime() - completedDaysBefore * DAY)
  await repo.markRedemptionGranted(redemption.id, at)
  const stored = repo.redemptions.find((r) => r.id === redemption.id)!
  stored.createdAt = at
  stored.completedAt = at
  stored.bonusAmounts = DEFAULTS.amounts
  return created
}

describe('correções da revisão do Lote 2', () => {
  test('presente sem aquisição (antes da 0013) é reparado no pagamento e rende o bônus', async () => {
    const ctx = setup()
    const seller = await giftWithoutAcquisition(ctx.repo, 60)
    expect((await ctx.pay('pay-1')).kind).toBe('ok')
    expect(ctx.acquisitions.items.find((a) => a.kind === 'gift')?.bonusTerms?.windowDays).toBe(3650)
    expect(ctx.repo.conversions[0]).toMatchObject({
      ambassadorId: seller.ambassador.id,
      status: 'pending',
      bonusCents: 3000,
    })
  })

  test('corte fixo: antes da data, prazo longo; depois, o prazo de hoje', async () => {
    const legacyBefore = new Date(PAID_AT.getTime() - 10 * DAY)
    const old = setup({ legacyBefore })
    await giftWithoutAcquisition(old.repo, 12)
    await old.maintenance.repairGifts()
    expect(old.acquisitions.items[0]?.bonusTerms?.windowDays).toBe(3650)

    const recent = setup({ legacyBefore })
    await giftWithoutAcquisition(recent.repo, 3)
    await recent.maintenance.repairGifts()
    expect(recent.acquisitions.items[0]?.bonusTerms?.windowDays).toBe(45)
  })

  test('slug: oferta que o catálogo não resolve não trava as mais novas', async () => {
    const ctx = setup()
    for (const id of ['p1', 'p2', 'p3'])
      await ctx.pay(id, {
        subscriptionId: null,
        metadata: {
          offerId: id === 'p3' ? COMMUNITY.id : '0ffe0000-0000-4000-8000-0000000000a0',
          billingAudience: 'kids',
        },
      })
    // Lote de 2: o 1º ciclo só vê as duas arquivadas; o 2º alcança a terceira.
    expect(await ctx.maintenance.fillOfferSlugs()).toBe(0)
    expect(await ctx.maintenance.fillOfferSlugs()).toBe(1)
    expect(ctx.acquisitions.items.find((a) => a.paymentId === 'p3')).toMatchObject({
      offerSlug: COMMUNITY.slug,
      kind: 'subscription',
    })
  })

  test('mesma conta com outro e-mail de cobrança não ganha o bônus duas vezes', async () => {
    const ctx = setup()
    const created = await ctx.repo.createAmbassadorWithCode({
      name: 'Mariana',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed')
    await ctx.pay('pay-a', {
      customer: { email: 'a@example.com' },
      metadata: {
        offerId: COMMUNITY.id,
        billingAudience: 'kids',
        accountUserId: 'conta-1',
        origemCodigo: 'mari-x7k2',
      },
    })
    await ctx.pay('pay-b', {
      customer: { email: 'b@example.com' },
      metadata: { offerId: COMMUNITY.id, billingAudience: 'kids', accountUserId: 'conta-1' },
    })
    expect(ctx.repo.conversions.filter((c) => c.status === 'pending')).toHaveLength(1)
  })

  test('fonte de mídia com sublinhado vira anúncio; compra sem bônus reconfere o pagamento', async () => {
    const ctx = setup()
    await ctx.pay('pay-ads', {
      subscriptionId: null,
      metadata: { offerId: COMMUNITY.id, billingAudience: 'kids', origemFonte: 'google_ads' },
    })
    expect(ctx.acquisitions.items[0]).toMatchObject({
      originKind: 'ads',
      utm: { utmSource: 'google_ads' },
    })
    expect(ctx.getPaymentCalls).toBe(2)
  })
})
