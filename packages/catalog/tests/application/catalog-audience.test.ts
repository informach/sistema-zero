import { expect, test } from 'bun:test'
import { createLogger } from '@sistemazero/core/logging'
import { CreateCouponService } from '../../src/application/create-coupon/create-coupon.service'
import { CreateOfferService } from '../../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../../src/application/create-product/create-product.service'
import { toProductView } from '../../src/application/mappers/product-view'
import { QuoteOfferService } from '../../src/application/quote-offer/quote-offer.service'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { UpdateCouponService } from '../../src/application/update-coupon/update-coupon.service'
import {
  InMemoryCouponRepository,
  InMemoryOfferRepository,
  InMemoryProductRepository,
} from '../fakes/in-memory'

function fixture() {
  const products = new InMemoryProductRepository()
  const logger = createLogger({ level: 'error' })
  const offers = new InMemoryOfferRepository()
  const coupons = new InMemoryCouponRepository()
  const resolver = new ResolveOfferEntitlementsService(products)
  const create = new CreateProductService(products, logger)
  return {
    products,
    create,
    createOffer: new CreateOfferService(offers, products, resolver, logger),
    createCoupon: new CreateCouponService(coupons, offers, products, logger),
    updateCoupon: new UpdateCouponService(coupons, offers, products, logger),
    quote: new QuoteOfferService(offers, coupons, products, resolver),
  }
}

async function sale(f: ReturnType<typeof fixture>, audience: 'kids' | 'adult') {
  const product = await f.create.execute({
    audience,
    sku: `course-${audience}`,
    slug: `course-${audience}`,
    name: audience,
    kind: 'course',
    status: 'active',
    fulfillment: { accessType: 'course', courseRef: `course-${audience}` },
  })
  const offer = await f.createOffer.execute({
    productId: product.id,
    code: `offer-${audience}`,
    slug: `offer-${audience}`,
    name: audience,
    priceCents: 10000,
    status: 'active',
    content: { allowsCoupon: true },
  })
  return { product, offer }
}

test('comunidade é persistida na identidade do produto e exposta na view', async () => {
  const { products, create } = fixture()
  const view = await create.execute({
    sku: 'adult-test',
    slug: 'adult-test',
    name: 'Produto adulto',
    audience: 'adult',
  })
  const stored = await products.findById(view.id)
  expect(view.audience).toBe('adult')
  expect(stored?.audience).toBe('adult')
  expect(stored && toProductView(stored).audience).toBe('adult')
})

test('chave de todos os cursos não pode conceder a outra comunidade', async () => {
  const { create } = fixture()
  for (const audience of ['kids', 'adult'] as const) {
    const input = {
      audience,
      sku: audience,
      slug: audience,
      name: audience,
      kind: 'course' as const,
    }
    await expect(
      create.execute({
        ...input,
        fulfillment: { accessType: audience === 'kids' ? 'all_courses' : 'all_kids_courses' },
      }),
    ).rejects.toThrow('comunidade')
  }
})

test('combo não pode incluir um produto da outra comunidade', async () => {
  const { create } = fixture()
  const adult = await create.execute({
    sku: 'adult-component',
    slug: 'adult-component',
    name: 'Adulto',
    audience: 'adult',
  })
  await expect(
    create.execute({
      sku: 'kids-bundle',
      slug: 'kids-bundle',
      name: 'Kids',
      audience: 'kids',
      kind: 'bundle',
      components: [{ componentProductId: adult.id }],
    }),
  ).rejects.toThrow('comunidade')
})

test('bônus e escopo explícito de cupom recusam produtos/ofertas da outra comunidade', async () => {
  const f = fixture(),
    kids = await sale(f, 'kids'),
    adult = await sale(f, 'adult')
  await expect(
    f.createOffer.execute({
      productId: kids.product.id,
      code: 'mixed',
      slug: 'mixed',
      name: 'Mixed',
      priceCents: 10000,
      items: [{ productId: adult.product.id }],
    }),
  ).rejects.toThrow('comunidade')
  await expect(
    f.createCoupon.execute({
      audience: 'kids',
      code: 'MIXED',
      type: 'percent',
      percentOff: 10,
      offerIds: [adult.offer.id],
    }),
  ).rejects.toThrow('comunidade')
  const coupon = await f.createCoupon.execute({
    audience: 'kids',
    code: 'KIDS',
    type: 'percent',
    percentOff: 10,
    offerIds: [kids.offer.id],
  })
  await expect(
    f.updateCoupon.execute({ id: coupon.id, offerIds: [adult.offer.id] }),
  ).rejects.toThrow('comunidade')
  expect(
    (await f.quote.execute({ offerSlug: kids.offer.slug, couponCode: 'KIDS' })).discountCents,
  ).toBe(1000)
})

test('cupom para todas as ofertas continua restrito à sua comunidade na cotação pública', async () => {
  const f = fixture(),
    kids = await sale(f, 'kids'),
    adult = await sale(f, 'adult')
  await f.createCoupon.execute({
    audience: 'kids',
    code: 'ALLKIDS',
    type: 'percent',
    percentOff: 10,
    appliesToAll: true,
  })
  expect(
    (await f.quote.execute({ offerSlug: kids.offer.slug, couponCode: 'ALLKIDS' })).finalPriceCents,
  ).toBe(9000)
  await expect(
    f.quote.execute({ offerSlug: adult.offer.slug, couponCode: 'ALLKIDS' }),
  ).rejects.toThrow('comunidade')
})
