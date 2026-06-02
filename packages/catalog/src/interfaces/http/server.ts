import { swagger } from '@elysiajs/swagger'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { CreateCouponService } from '../../application/create-coupon/create-coupon.service'
import type { CreateOfferService } from '../../application/create-offer/create-offer.service'
import type { CreateProductService } from '../../application/create-product/create-product.service'
import type { GetOfferService } from '../../application/get-offer/get-offer.service'
import type { GetProductService } from '../../application/get-product/get-product.service'
import type { QuoteOfferService } from '../../application/quote-offer/quote-offer.service'
import type { RedeemCouponService } from '../../application/redeem-coupon/redeem-coupon.service'
import type { UpdateCouponService } from '../../application/update-coupon/update-coupon.service'
import type { UpdateOfferService } from '../../application/update-offer/update-offer.service'
import type { UpdateProductService } from '../../application/update-product/update-product.service'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { isOversizeBody, markOversizeBody } from './raw-body'
import { adminRoutes } from './routes/admin.routes'
import { catalogRoutes } from './routes/catalog.routes'
import { healthRoutes } from './routes/health.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  getOffer: GetOfferService
  getProduct: GetProductService
  quoteOffer: QuoteOfferService
  redeemCoupon: RedeemCouponService
  createProduct: CreateProductService
  updateProduct: UpdateProductService
  createOffer: CreateOfferService
  updateOffer: UpdateOfferService
  createCoupon: CreateCouponService
  updateCoupon: UpdateCouponService
}

/**
 * Monta a aplicação Elysia do catálogo: limite de corpo (anti-DoS), tratamento
 * central de erros, Swagger (fora de produção), rotas públicas de leitura e
 * rotas admin de escrita.
 */
export function createServer(deps: HttpDeps) {
  const app = new Elysia({
    serve: { maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES },
  })
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = deps.env.MAX_REQUEST_BODY_BYTES
      const declared = Number(request.headers.get('content-length') ?? '0')
      if (Number.isFinite(declared) && declared > maxBytes) {
        markOversizeBody(request)
        return undefined
      }
      if (contentType?.includes('application/json')) {
        const text = await request.text()
        // Rede de segurança caso o Content-Length minta/esteja ausente.
        if (Buffer.byteLength(text, 'utf8') > maxBytes) {
          markOversizeBody(request)
          return {}
        }
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
    })
    // Guarda primária do tamanho é o `maxRequestBodySize` do Bun.serve (413 automático);
    // este é o caminho EXPLÍCITO de 413 quando o `onParse` marcou um corpo acima do teto
    // (Content-Length ausente/mentindo). Sem isto, o `markOversizeBody` seria código morto.
    .onBeforeHandle({ as: 'global' }, ({ request }) => {
      if (isOversizeBody(request)) throw new PayloadTooLargeError()
    })
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const { status, body } = buildErrorResponse({ code, error, logger: deps.logger })
      set.status = status
      return body
    })

  if (deps.env.NODE_ENV !== 'production') {
    app.use(
      swagger({
        path: '/swagger',
        documentation: {
          info: {
            title: 'Sistema Zero — Catalog API',
            version: '0.1.0',
            description:
              'Catálogo: produtos, combos e ofertas (fonte da verdade comercial) + resolução de entitlements.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes())
    .use(
      catalogRoutes({
        getOffer: deps.getOffer,
        getProduct: deps.getProduct,
        quoteOffer: deps.quoteOffer,
        redeemCoupon: deps.redeemCoupon,
      }),
    )
    .use(
      adminRoutes({
        requireAdminEnabled: deps.env.REQUIRE_ADMIN,
        createProduct: deps.createProduct,
        updateProduct: deps.updateProduct,
        createOffer: deps.createOffer,
        updateOffer: deps.updateOffer,
        createCoupon: deps.createCoupon,
        updateCoupon: deps.updateCoupon,
      }),
    )
}
