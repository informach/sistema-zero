import { envelope } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { GetOfferService } from '../../../application/get-offer/get-offer.service'
import type { GetProductService } from '../../../application/get-product/get-product.service'
import type { OfferView } from '../../../application/mappers/offer-view'
import type { PublicProductView } from '../../../application/mappers/product-view'
import type { QuoteOfferService } from '../../../application/quote-offer/quote-offer.service'
import type { RedeemCouponService } from '../../../application/redeem-coupon/redeem-coupon.service'
import type { MicroCache } from '../../../infrastructure/cache/micro-cache'
import { assertInternalCaller } from '../auth'
import { QuoteOfferBody } from '../dtos'

export interface CatalogRoutesDeps {
  logger: Logger
  getOffer: GetOfferService
  getProduct: GetProductService
  quoteOffer: QuoteOfferService
  redeemCoupon: RedeemCouponService
  /** Token interno (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  /** TTL do micro-cache das leituras públicas por slug. 0/ausente → desligado. */
  publicCacheTtlMs?: number
  offerCache: MicroCache<OfferView | null>
  productCache: MicroCache<PublicProductView | null>
}

/**
 * Rotas de LEITURA + cotação/resgate de cupom. Leituras e `quote` são públicas no
 * gateway (rate limit por IP) e devolvem SÓ dados de marketing (oferta `draft` e
 * produto `draft` são inexistentes ao público; a view pública de produto não traz
 * `fulfillment`). `entitlements` (S2S do members) e `redeem` (HMAC do funil no
 * gateway) exigem o `x-internal-token` — sem ele, qualquer processo que alcançasse
 * o serviço direto leria o manifesto de entrega ou queimaria contador de cupom.
 *
 * As leituras públicas passam por um micro-cache TTL (hot path da página de
 * vendas: 6–8 queries por render sem cache). A `quote` NUNCA é cacheada (é o
 * valor autoritativo de cobrança).
 */
export function catalogRoutes(deps: CatalogRoutesDeps) {
  const offerCache = deps.offerCache
  const productCache = deps.productCache

  return (
    new Elysia({ prefix: '/catalog' })
      .get('/offers/:slug', async ({ params, set }) => {
        const key = params.slug.trim().toLowerCase()
        let offer = offerCache.get(key)
        if (offer === undefined) {
          // Slug com fallback por UUID: o fiscal resolve a oferta pelo
          // `metadata.offerId` do pagamento (mesma view pública, mesmo cache).
          offer = await deps.getOffer.getBySlugOrId(params.slug)
          offerCache.set(key, offer)
        }
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
        // Esta chamada NÃO passa pelo gateway (sem access log lá) — log próprio
        // para a trilha de quem leu o manifesto de entrega.
        deps.logger.info('catalog.entitlements_read', {
          slug: params.slug,
          found: Boolean(result),
        })
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
        const key = params.slug.trim().toLowerCase()
        let product = productCache.get(key)
        if (product === undefined) {
          product = await deps.getProduct.getPublicBySlug(params.slug)
          productCache.set(key, product)
        }
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
        const idempotencyKey = headers['idempotency-key']
        await deps.redeemCoupon.execute(params.code, idempotencyKey)
        return { ok: true }
      })
  )
}
