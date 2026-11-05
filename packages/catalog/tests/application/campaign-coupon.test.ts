import { describe, expect, test } from 'bun:test'
import { createLogger } from '@sistemazero/core/logging'
import type { CampaignCouponPolicy } from '@sistemazero/core/referrals'
import { CampaignCouponService } from '../../src/application/campaign-coupon/campaign-coupon.service'
import { CreateCouponService } from '../../src/application/create-coupon/create-coupon.service'
import { CreateOfferService } from '../../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../../src/application/create-product/create-product.service'
import { QuoteOfferService } from '../../src/application/quote-offer/quote-offer.service'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { UpdateCouponService } from '../../src/application/update-coupon/update-coupon.service'
import {
  InMemoryCouponRepository,
  InMemoryOfferRepository,
  InMemoryProductRepository,
} from '../fakes/in-memory'

const campaignId = '11111111-1111-4111-8111-111111111111'
async function fixture(audience: 'kids' | 'adult' = 'kids') {
  const products = new InMemoryProductRepository(),
    offers = new InMemoryOfferRepository(),
    coupons = new InMemoryCouponRepository()
  const logger = createLogger({ level: 'error' })
  const resolver = new ResolveOfferEntitlementsService(products)
  const product = await new CreateProductService(products, logger).execute({
    audience,
    sku: 'course-test',
    slug: 'course-test',
    name: 'Curso',
    kind: 'course',
    status: 'active',
    fulfillment: { accessType: 'course', courseRef: 'course-test' },
  })
  const offer = await new CreateOfferService(offers, products, resolver, logger).execute({
    productId: product.id,
    code: 'offer-test',
    slug: 'offer-test',
    name: 'Desafio',
    priceCents: 6700,
    status: 'active',
    content: { allowsCoupon: true },
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
  })
  const create = new CreateCouponService(coupons, offers, products, logger)
  const coupon = await create.execute({
    audience,
    code: 'EVENTO50',
    type: 'percent',
    percentOff: 50,
    status: 'active',
    offerIds: [offer.id],
    metadata: { campaignId },
  })
  let policy: CampaignCouponPolicy | null = {
    audience,
    couponId: coupon.id,
    offerId: offer.id,
    status: 'active',
    startsAt: '2026-11-06T03:00:00Z',
    endsAt: '2026-11-13T03:00:00Z',
  }
  let instant = Date.parse('2026-11-10T12:00:00Z')
  let fail = false
  const quote = new QuoteOfferService(
    offers,
    coupons,
    products,
    resolver,
    {
      async get() {
        if (fail) throw new Error('unavailable')
        return policy
      },
    },
    () => instant,
  )
  return {
    audience,
    coupon,
    offer,
    create,
    quote,
    details: new CampaignCouponService(coupons, offers, products),
    update: new UpdateCouponService(coupons, offers, products, logger),
    setPolicy(next: CampaignCouponPolicy | null) {
      policy = next
    },
    policy,
    time(value: string) {
      instant = Date.parse(value)
    },
    fail() {
      fail = true
    },
  }
}

describe('cupom opcional de campanha', () => {
  for (const audience of ['kids', 'adult'] as const)
    test(`${audience}: 50% custa 33,50 e mantém 30 dias de curso, mesmo após o presente fechar`, async () => {
      const f = await fixture(audience)
      expect(
        await f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
      ).toMatchObject({
        finalPriceCents: 3350,
        accessMode: 'fixed',
        accessDurationValue: 30,
        accessDurationUnit: 'days',
      })
      expect(
        await f.details.get({ couponId: f.coupon.id, offerId: f.offer.id, campaignId, audience }),
      ).toMatchObject({ code: 'EVENTO50', percentOff: 50 })
      expect(
        await f.details.get({
          couponId: f.coupon.id,
          offerId: f.offer.id,
          campaignId,
          audience: audience === 'kids' ? 'adult' : 'kids',
        }),
      ).toBeNull()
    })
  test('fronteiras, alteração da data e estado são validados no servidor', async () => {
    const f = await fixture()
    f.time('2026-11-06T02:59:59.999Z')
    await expect(
      f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
    ).rejects.toThrow('período')
    f.time('2026-11-06T03:00:00Z')
    expect(
      (await f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }))
        .finalPriceCents,
    ).toBe(3350)
    f.time('2026-11-13T03:00:00Z')
    await expect(
      f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
    ).rejects.toMatchObject({ code: 'COUPON_EXPIRED' })
    f.setPolicy({ ...f.policy!, endsAt: '2026-11-20T03:00:00Z' })
    expect(
      (await f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }))
        .finalPriceCents,
    ).toBe(3350)
    for (const status of ['draft', 'paused', 'ended'] as const) {
      f.setPolicy({ ...f.policy!, status, endsAt: '2026-11-20T03:00:00Z' })
      await expect(
        f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
      ).rejects.toThrow('período')
    }
  })
  test('vínculo incompleto, oferta diferente ou falha de consulta nunca concedem desconto', async () => {
    const f = await fixture()
    f.setPolicy(null)
    await expect(
      f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
    ).rejects.toThrow()
    f.setPolicy({ ...f.policy!, offerId: campaignId })
    await expect(
      f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
    ).rejects.toThrow()
    f.fail()
    await expect(
      f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
    ).rejects.toThrow('unavailable')
    const isolated = await f.create.execute({
      audience: 'kids',
      code: 'AVULSO',
      type: 'percent',
      percentOff: 10,
      status: 'active',
      appliesToAll: true,
    })
    expect(
      (await f.quote.execute({ offerSlug: f.offer.slug, couponCode: isolated.code }))
        .finalPriceCents,
    ).toBe(6030)
    expect((await f.quote.execute({ offerSlug: f.offer.slug })).finalPriceCents).toBe(6700)
  })
  test('não permite desligar o calendário por metadata, validade paralela ou ampliação do escopo', async () => {
    const f = await fixture()
    for (const patch of [
      { metadata: null },
      { appliesToAll: true },
      { validUntil: new Date() },
      { offerIds: [] },
    ]) {
      await expect(f.update.execute({ id: f.coupon.id, ...patch })).rejects.toThrow()
    }
    await f.update.execute({ id: f.coupon.id, status: 'inactive' })
    await expect(
      f.quote.execute({ offerSlug: f.offer.slug, couponCode: f.coupon.code }),
    ).rejects.toThrow()
  })
})
