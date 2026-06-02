import { envelope } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { GetOfferService } from '../../../application/get-offer/get-offer.service'
import type { GetProductService } from '../../../application/get-product/get-product.service'
import type { QuoteOfferService } from '../../../application/quote-offer/quote-offer.service'
import type { RedeemCouponService } from '../../../application/redeem-coupon/redeem-coupon.service'
import { QuoteOfferBody } from '../dtos'

export interface CatalogRoutesDeps {
  getOffer: GetOfferService
  getProduct: GetProductService
  quoteOffer: QuoteOfferService
  redeemCoupon: RedeemCouponService
}

/**
 * Rotas de LEITURA + cotação/resgate de cupom. Leituras e `quote` são públicas no
 * gateway (rate limit por IP); `redeem` é gated pelo HMAC do funil no gateway. No
 * app são rotas simples — o gateway é o PEP (catálogo só é alcançável por ele em prod).
 */
export function catalogRoutes(deps: CatalogRoutesDeps) {
  return (
    new Elysia({ prefix: '/catalog' })
      .get('/offers/:slug', async ({ params, set }) => {
        const offer = await deps.getOffer.getBySlug(params.slug)
        if (!offer) {
          set.status = 404
          return envelope('OFFER_NOT_FOUND', 'Oferta não encontrada')
        }
        return offer
      })
      // Entitlements expõem o `fulfillment` (asset url/ref) → consumo INTERNO (área de
      // membros, S2S na rede interna). NÃO há rota pública para isto no gateway.
      .get('/offers/:slug/entitlements', async ({ params, set }) => {
        const result = await deps.getOffer.getEntitlements(params.slug)
        if (!result) {
          set.status = 404
          return envelope('OFFER_NOT_FOUND', 'Oferta não encontrada')
        }
        return result
      })
      .post(
        '/offers/:slug/quote',
        async ({ params, body }) => {
          return deps.quoteOffer.execute({ offerSlug: params.slug, couponCode: body.couponCode })
        },
        { body: QuoteOfferBody },
      )
      .get('/products/:slug', async ({ params, set }) => {
        const product = await deps.getProduct.getBySlug(params.slug)
        if (!product) {
          set.status = 404
          return envelope('PRODUCT_NOT_FOUND', 'Produto não encontrado')
        }
        return product
      })
      .post('/coupons/:code/redeem', async ({ params }) => {
        await deps.redeemCoupon.execute(params.code)
        return { ok: true }
      })
  )
}
