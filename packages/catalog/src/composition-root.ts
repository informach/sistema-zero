import { createLogger, type Logger } from '@sistemazero/core/logging'
import { CreateCouponService } from './application/create-coupon/create-coupon.service'
import { CreateOfferService } from './application/create-offer/create-offer.service'
import { CreateProductService } from './application/create-product/create-product.service'
import { GetOfferService } from './application/get-offer/get-offer.service'
import { GetProductService } from './application/get-product/get-product.service'
import { ListCouponsService } from './application/list-coupons/list-coupons.service'
import { ListOffersService } from './application/list-offers/list-offers.service'
import { ListProductsService } from './application/list-products/list-products.service'
import { QuoteOfferService } from './application/quote-offer/quote-offer.service'
import { RedeemCouponService } from './application/redeem-coupon/redeem-coupon.service'
import { ResolveOfferEntitlementsService } from './application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { UpdateCouponService } from './application/update-coupon/update-coupon.service'
import { UpdateOfferService } from './application/update-offer/update-offer.service'
import { UpdateProductService } from './application/update-product/update-product.service'
import type { Env } from './infrastructure/config/env'
import { DrizzleCouponRepository } from './infrastructure/persistence/drizzle/coupon.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleOfferRepository } from './infrastructure/persistence/drizzle/offer.repository'
import { DrizzleProductRepository } from './infrastructure/persistence/drizzle/product.repository'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar onde adapters
 * concretos são instanciados e plugados nos ports.
 */
export function createApplication(env: Env): Application {
  const logger = createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    pretty: env.NODE_ENV !== 'production',
  })

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
  })
  const db = connection.db

  // Adapters
  const products = new DrizzleProductRepository(db)
  const offers = new DrizzleOfferRepository(db)
  const coupons = new DrizzleCouponRepository(db)

  // Serviços de domínio/aplicação
  const resolver = new ResolveOfferEntitlementsService(products)
  const getOffer = new GetOfferService(offers, products, resolver)
  const getProduct = new GetProductService(products)
  const listProducts = new ListProductsService(products)
  const listOffers = new ListOffersService(offers, products)
  const listCoupons = new ListCouponsService(coupons)
  const quoteOffer = new QuoteOfferService(offers, coupons)
  const redeemCoupon = new RedeemCouponService(coupons, logger)
  const createProduct = new CreateProductService(products, logger)
  const updateProduct = new UpdateProductService(products, logger)
  const createOffer = new CreateOfferService(offers, products, resolver, logger)
  const updateOffer = new UpdateOfferService(offers, products, resolver, logger)
  const createCoupon = new CreateCouponService(coupons, offers, logger)
  const updateCoupon = new UpdateCouponService(coupons, offers, logger)

  const server = createServer({
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

  return {
    logger,
    async start() {
      server.listen(env.PORT)
      logger.info('http.listening', { port: env.PORT })
    },
    async stop() {
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
