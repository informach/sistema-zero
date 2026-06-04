import { beforeEach, describe, expect, it } from 'bun:test'
import { createLogger } from '@sistemazero/core/logging'
import { CreateCouponService } from '../../src/application/create-coupon/create-coupon.service'
import { CreateOfferService } from '../../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../../src/application/create-product/create-product.service'
import { GetOfferService } from '../../src/application/get-offer/get-offer.service'
import { GetProductService } from '../../src/application/get-product/get-product.service'
import { ListCouponsService } from '../../src/application/list-coupons/list-coupons.service'
import { ListOffersService } from '../../src/application/list-offers/list-offers.service'
import { ListProductsService } from '../../src/application/list-products/list-products.service'
import { QuoteOfferService } from '../../src/application/quote-offer/quote-offer.service'
import { RedeemCouponService } from '../../src/application/redeem-coupon/redeem-coupon.service'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { UpdateCouponService } from '../../src/application/update-coupon/update-coupon.service'
import { UpdateOfferService } from '../../src/application/update-offer/update-offer.service'
import { UpdateProductService } from '../../src/application/update-product/update-product.service'
import { loadEnv } from '../../src/infrastructure/config/env'
import { createServer } from '../../src/interfaces/http/server'
import {
  InMemoryCouponRepository,
  InMemoryOfferRepository,
  InMemoryProductRepository,
} from '../fakes/in-memory'

const logger = createLogger({ level: 'error', pretty: false })
const env = loadEnv({
  DATABASE_URL: 'postgres://localhost:5433/test',
  NODE_ENV: 'test',
  REQUIRE_ADMIN: 'true',
})

function build() {
  const products = new InMemoryProductRepository()
  const offers = new InMemoryOfferRepository()
  const coupons = new InMemoryCouponRepository()
  const resolver = new ResolveOfferEntitlementsService(products)
  const createProduct = new CreateProductService(products, logger)
  const updateProduct = new UpdateProductService(products, logger)
  const createOffer = new CreateOfferService(offers, products, resolver, logger)
  const updateOffer = new UpdateOfferService(offers, products, resolver, logger)
  const getOffer = new GetOfferService(offers, products, resolver)
  const getProduct = new GetProductService(products)
  const listProducts = new ListProductsService(products)
  const listOffers = new ListOffersService(offers, products)
  const listCoupons = new ListCouponsService(coupons)
  const quoteOffer = new QuoteOfferService(offers, coupons)
  const redeemCoupon = new RedeemCouponService(coupons, logger)
  const createCoupon = new CreateCouponService(coupons, offers, logger)
  const updateCoupon = new UpdateCouponService(coupons, offers, logger)
  const app = createServer({
    env,
    logger,
    getOffer,
    getProduct,
    listProducts,
    listOffers,
    listCoupons,
    quoteOffer,
    redeemCoupon,
    createProduct,
    updateProduct,
    createOffer,
    updateOffer,
    createCoupon,
    updateCoupon,
  })
  return { app, createProduct, createOffer, createCoupon }
}

function req(
  method: string,
  path: string,
  opts?: { body?: unknown; headers?: Record<string, string> },
) {
  const headers: Record<string, string> = { ...(opts?.headers ?? {}) }
  let body: string | undefined
  if (opts?.body !== undefined) {
    body = JSON.stringify(opts.body)
    headers['content-type'] = 'application/json'
  }
  return new Request(`http://localhost${path}`, { method, headers, body })
}

const ADMIN = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }

describe('catalog HTTP', () => {
  it('GET /health → ok', async () => {
    const { app } = build()
    const res = await app.handle(req('GET', '/health'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok', service: 'catalog' })
  })

  describe('leitura pública da oferta', () => {
    let app: ReturnType<typeof build>['app']

    beforeEach(async () => {
      const built = build()
      app = built.app
      await built.createProduct.execute({
        sku: 'no-comando-da-ia',
        slug: 'no-comando-da-ia',
        name: 'No Comando da IA',
        kind: 'ebook',
        status: 'active',
      })
      const product = await built.createProduct.execute({
        sku: 'x',
        slug: 'x',
        name: 'X',
        kind: 'ebook',
      })
      // resolve o id do produto principal a partir da view
      const main = await app.handle(req('GET', '/catalog/products/no-comando-da-ia'))
      const mainView = (await main.json()) as { id: string }
      await built.createOffer.execute({
        productId: mainView.id,
        code: 'ncia-padrao',
        slug: 'no-comando-da-ia',
        name: 'Oferta padrão',
        priceCents: 3700,
        compareAtPriceCents: 9700,
        guaranteeDays: 7,
        status: 'active',
        items: [{ productId: product.id }],
      })
    })

    it('GET /catalog/offers/:slug retorna preço + inclusos com principal marcado', async () => {
      const res = await app.handle(req('GET', '/catalog/offers/no-comando-da-ia'))
      expect(res.status).toBe(200)
      const view = (await res.json()) as {
        priceCents: number
        compareAtPriceCents: number
        guaranteeDays: number
        isAvailable: boolean
        includes: { productId: string; isPrimary: boolean }[]
      }
      expect(view.priceCents).toBe(3700)
      expect(view.compareAtPriceCents).toBe(9700)
      expect(view.guaranteeDays).toBe(7)
      expect(view.isAvailable).toBe(true)
      expect(view.includes.length).toBe(2)
      expect(view.includes.filter((i) => i.isPrimary)).toHaveLength(1)
    })

    it('GET /catalog/offers/:slug inexistente → 404', async () => {
      const res = await app.handle(req('GET', '/catalog/offers/nao-existe'))
      expect(res.status).toBe(404)
      expect((await res.json()) as { error: { code: string } }).toMatchObject({
        error: { code: 'OFFER_NOT_FOUND' },
      })
    })
  })

  describe('escrita admin (RBAC defesa em profundidade)', () => {
    const productBody = { sku: 'p1', slug: 'p1', name: 'P1', kind: 'ebook' }

    it('sem header de role → 401', async () => {
      const { app } = build()
      const res = await app.handle(req('POST', '/catalog/products', { body: productBody }))
      expect(res.status).toBe(401)
    })

    it('role customer → 403', async () => {
      const { app } = build()
      const res = await app.handle(
        req('POST', '/catalog/products', {
          body: productBody,
          headers: { 'x-auth-user-role': 'customer', 'x-auth-user-status': 'active' },
        }),
      )
      expect(res.status).toBe(403)
    })

    it('role admin → 201 cria o produto', async () => {
      const { app } = build()
      const res = await app.handle(
        req('POST', '/catalog/products', { body: productBody, headers: ADMIN }),
      )
      expect(res.status).toBe(201)
      const view = (await res.json()) as { sku: string; status: string }
      expect(view.sku).toBe('p1')
      expect(view.status).toBe('draft')
    })

    it('sku duplicado → 409', async () => {
      const { app } = build()
      await app.handle(req('POST', '/catalog/products', { body: productBody, headers: ADMIN }))
      const res = await app.handle(
        req('POST', '/catalog/products', { body: productBody, headers: ADMIN }),
      )
      expect(res.status).toBe(409)
      expect((await res.json()) as { error: { code: string } }).toMatchObject({
        error: { code: 'DUPLICATE_PRODUCT' },
      })
    })
  })

  describe('cupons (desconto na oferta)', () => {
    let app: ReturnType<typeof build>['app']

    beforeEach(async () => {
      const built = build()
      app = built.app
      const product = await built.createProduct.execute({
        sku: 'ncia',
        slug: 'ncia',
        name: 'NCIA',
        kind: 'ebook',
        status: 'active',
      })
      await built.createOffer.execute({
        productId: product.id,
        code: 'ncia-of',
        slug: 'ncia',
        name: 'Oferta',
        priceCents: 3700,
        status: 'active',
      })
      await app.handle(
        req('POST', '/catalog/coupons', {
          headers: ADMIN,
          body: { code: 'PROMO10', type: 'percent', percentOff: 10, appliesToAll: true },
        }),
      )
    })

    it('quote sem cupom = preço cheio', async () => {
      const res = await app.handle(req('POST', '/catalog/offers/ncia/quote', { body: {} }))
      expect(res.status).toBe(200)
      const q = (await res.json()) as {
        priceCents: number
        discountCents: number
        finalPriceCents: number
        coupon: unknown
      }
      expect(q).toMatchObject({
        priceCents: 3700,
        discountCents: 0,
        finalPriceCents: 3700,
        coupon: null,
      })
    })

    it('quote com cupom 10% (case-insensitive) aplica desconto', async () => {
      const res = await app.handle(
        req('POST', '/catalog/offers/ncia/quote', { body: { couponCode: 'promo10' } }),
      )
      expect(res.status).toBe(200)
      const q = (await res.json()) as {
        discountCents: number
        finalPriceCents: number
        coupon: { code: string }
      }
      expect(q.discountCents).toBe(370)
      expect(q.finalPriceCents).toBe(3330)
      expect(q.coupon.code).toBe('PROMO10')
    })

    it('quote com cupom inexistente → 404', async () => {
      const res = await app.handle(
        req('POST', '/catalog/offers/ncia/quote', { body: { couponCode: 'NOPE' } }),
      )
      expect(res.status).toBe(404)
    })

    it('criar cupom sem role admin → 401', async () => {
      const res = await app.handle(
        req('POST', '/catalog/coupons', {
          body: { code: 'X', type: 'percent', percentOff: 5, appliesToAll: true },
        }),
      )
      expect(res.status).toBe(401)
    })

    it('redeem incrementa e respeita o limite de usos', async () => {
      await app.handle(
        req('POST', '/catalog/coupons', {
          headers: ADMIN,
          body: {
            code: 'ONCE',
            type: 'fixed',
            amountOffCents: 500,
            appliesToAll: true,
            maxRedemptions: 1,
          },
        }),
      )
      const first = await app.handle(req('POST', '/catalog/coupons/once/redeem', { body: {} }))
      expect(first.status).toBe(200)
      const second = await app.handle(req('POST', '/catalog/coupons/once/redeem', { body: {} }))
      expect(second.status).toBe(422)
      expect((await second.json()) as { error: { code: string } }).toMatchObject({
        error: { code: 'COUPON_EXHAUSTED' },
      })
    })
  })

  describe('leitura admin (listagens paginadas)', () => {
    async function seed(built: ReturnType<typeof build>) {
      const p1 = await built.createProduct.execute({
        sku: 'curso-ia',
        slug: 'curso-ia',
        name: 'Curso de IA',
        kind: 'course',
        status: 'active',
      })
      const p2 = await built.createProduct.execute({
        sku: 'ebook-ia',
        slug: 'ebook-ia',
        name: 'Ebook de IA',
        kind: 'ebook',
        status: 'draft',
      })
      await built.createOffer.execute({
        productId: p1.id,
        code: 'curso-of',
        slug: 'curso-of',
        name: 'Oferta do curso',
        priceCents: 19700,
        status: 'active',
        items: [{ productId: p2.id }],
      })
      await built.app.handle(
        req('POST', '/catalog/coupons', {
          headers: ADMIN,
          body: { code: 'BLACK', type: 'percent', percentOff: 50, appliesToAll: true },
        }),
      )
      return { p1, p2 }
    }

    it('GET /catalog/admin/products sem role → 401', async () => {
      const res = await build().app.handle(req('GET', '/catalog/admin/products'))
      expect(res.status).toBe(401)
    })

    it('GET /catalog/admin/products (admin) lista paginado', async () => {
      const built = build()
      await seed(built)
      const res = await built.app.handle(req('GET', '/catalog/admin/products', { headers: ADMIN }))
      expect(res.status).toBe(200)
      const page = (await res.json()) as {
        items: { slug: string; status: string }[]
        total: number
        limit: number
        offset: number
      }
      expect(page.total).toBe(2)
      expect(page.items.length).toBe(2)
      expect(page.limit).toBe(20)
    })

    it('GET /catalog/admin/products?status=active filtra', async () => {
      const built = build()
      await seed(built)
      const res = await built.app.handle(
        req('GET', '/catalog/admin/products?status=active', { headers: ADMIN }),
      )
      const page = (await res.json()) as { items: { slug: string }[]; total: number }
      expect(page.total).toBe(1)
      expect(page.items[0]?.slug).toBe('curso-ia')
    })

    it('GET /catalog/admin/products?q=ebook busca por nome/slug', async () => {
      const built = build()
      await seed(built)
      const res = await built.app.handle(
        req('GET', '/catalog/admin/products?q=ebook', { headers: ADMIN }),
      )
      const page = (await res.json()) as { items: { slug: string }[]; total: number }
      expect(page.total).toBe(1)
      expect(page.items[0]?.slug).toBe('ebook-ia')
    })

    it('GET /catalog/admin/offers anexa o nome do produto e os itens extras', async () => {
      const built = build()
      const { p1, p2 } = await seed(built)
      const res = await built.app.handle(req('GET', '/catalog/admin/offers', { headers: ADMIN }))
      expect(res.status).toBe(200)
      const page = (await res.json()) as {
        items: {
          productId: string
          productName: string | null
          isAvailable: boolean
          items: { productId: string; sortOrder: number }[]
        }[]
        total: number
      }
      expect(page.total).toBe(1)
      expect(page.items[0]?.productId).toBe(p1.id)
      expect(page.items[0]?.productName).toBe('Curso de IA')
      expect(page.items[0]?.isAvailable).toBe(true)
      // O painel edita a oferta enviando a coleção inteira — a view PRECISA dos itens.
      expect(page.items[0]?.items).toEqual([{ productId: p2.id, sortOrder: 0 }])
    })

    it('GET /catalog/admin/products/:id devolve a view completa (fulfillment/components)', async () => {
      const built = build()
      const { p1 } = await seed(built)
      const res = await built.app.handle(
        req('GET', `/catalog/admin/products/${p1.id}`, { headers: ADMIN }),
      )
      expect(res.status).toBe(200)
      const view = (await res.json()) as {
        id: string
        slug: string
        components: unknown[]
        fulfillment: unknown
      }
      expect(view.id).toBe(p1.id)
      expect(view.slug).toBe('curso-ia')
      expect(Array.isArray(view.components)).toBe(true)
    })

    it('GET /catalog/admin/products/:id inexistente ou malformado → 404', async () => {
      const built = build()
      await seed(built)
      const missing = await built.app.handle(
        req('GET', '/catalog/admin/products/00000000-0000-0000-0000-000000000000', {
          headers: ADMIN,
        }),
      )
      expect(missing.status).toBe(404)
      const malformed = await built.app.handle(
        req('GET', '/catalog/admin/products/nao-uuid', { headers: ADMIN }),
      )
      expect(malformed.status).toBe(404)
    })

    it('GET /catalog/admin/products/:id sem role → 401', async () => {
      const built = build()
      const { p1 } = await seed(built)
      const res = await built.app.handle(req('GET', `/catalog/admin/products/${p1.id}`))
      expect(res.status).toBe(401)
    })

    it('GET /catalog/admin/coupons lista cupons (role customer → 403)', async () => {
      const built = build()
      await seed(built)
      const ok = await built.app.handle(req('GET', '/catalog/admin/coupons', { headers: ADMIN }))
      const page = (await ok.json()) as { items: { code: string }[]; total: number }
      expect(page.total).toBe(1)
      expect(page.items[0]?.code).toBe('BLACK')

      const denied = await built.app.handle(
        req('GET', '/catalog/admin/coupons', {
          headers: { 'x-auth-user-role': 'customer', 'x-auth-user-status': 'active' },
        }),
      )
      expect(denied.status).toBe(403)
    })
  })

  describe('disponibilidade da oferta (M1)', () => {
    it('quote de oferta pausada → 409 OFFER_NOT_AVAILABLE (não gera preço a cobrar)', async () => {
      const built = build()
      const product = await built.createProduct.execute({
        sku: 'paused-p',
        slug: 'paused-p',
        name: 'P',
        kind: 'ebook',
        status: 'active',
      })
      await built.createOffer.execute({
        productId: product.id,
        code: 'paused-of',
        slug: 'paused-of',
        name: 'Oferta pausada',
        priceCents: 3700,
        status: 'paused',
      })
      const res = await built.app.handle(
        req('POST', '/catalog/offers/paused-of/quote', { body: {} }),
      )
      expect(res.status).toBe(409)
      expect((await res.json()) as { error: { code: string } }).toMatchObject({
        error: { code: 'OFFER_NOT_AVAILABLE' },
      })
    })
  })
})
