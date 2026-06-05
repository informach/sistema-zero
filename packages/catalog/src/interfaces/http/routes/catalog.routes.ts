import { envelope } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { GetOfferService } from '../../../application/get-offer/get-offer.service'
import type { GetProductService } from '../../../application/get-product/get-product.service'
import type { QuoteOfferService } from '../../../application/quote-offer/quote-offer.service'
import type { RedeemCouponService } from '../../../application/redeem-coupon/redeem-coupon.service'
import { assertInternalCaller } from '../auth'
import { QuoteOfferBody } from '../dtos'

export interface CatalogRoutesDeps {
  getOffer: GetOfferService
  getProduct: GetProductService
  quoteOffer: QuoteOfferService
  redeemCoupon: RedeemCouponService
  /** Token interno (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

/**
 * Rotas de LEITURA + cotação/resgate de cupom. Leituras e `quote` são públicas no
 * gateway (rate limit por IP) e devolvem SÓ dados de marketing (oferta `draft` e
 * produto `draft` são inexistentes ao público; a view pública de produto não traz
 * `fulfillment`). `entitlements` (S2S do members) e `redeem` (HMAC do funil no
 * gateway) exigem o `x-internal-token` — sem ele, qualquer processo que alcançasse
 * o serviço direto leria o manifesto de entrega ou queimaria contador de cupom.
 */
export function catalogRoutes(deps: CatalogRoutesDeps) {
  return (
    new Elysia({ prefix: '/catalog' })
      .get('/offers/:slug', async ({ params, set }) => {
        const offer = await deps.getOffer.getBySlug(params.slug)
        // Rascunho nunca foi publicado → inexistente ao público (não vaza preço/
        // campanha por adivinhação de slug). Pausada/arquivada seguem legíveis —
        // a página existente degrada e a `quote` já bloqueia a cobrança.
        if (!offer || offer.status === 'draft') {
          set.status = 404
          return envelope('OFFER_NOT_FOUND', 'Oferta não encontrada')
        }
        return offer
      })
      // Entitlements expõem o `fulfillment` (manifesto de entrega) → consumo INTERNO
      // (área de membros, S2S na rede interna). NÃO há rota pública no gateway, e o
      // serviço exige o token interno (defesa em profundidade contra acesso direto).
      .get('/offers/:slug/entitlements', async ({ params, headers, set }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
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
        const product = await deps.getProduct.getPublicBySlug(params.slug)
        if (!product) {
          set.status = 404
          return envelope('PRODUCT_NOT_FOUND', 'Produto não encontrado')
        }
        return product
      })
      // Gated pelo HMAC do funil no gateway; o token interno (header-inject do
      // gateway) prova que a chamada passou por lá.
      .post('/coupons/:code/redeem', async ({ params, headers }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        await deps.redeemCoupon.execute(params.code)
        return { ok: true }
      })
  )
}
