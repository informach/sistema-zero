import { ValidationError } from '@sistemazero/core/errors'
import { envelope } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { CreateCouponService } from '../../../application/create-coupon/create-coupon.service'
import type { CreateOfferService } from '../../../application/create-offer/create-offer.service'
import type { CreateProductService } from '../../../application/create-product/create-product.service'
import type { OfferView } from '../../../application/mappers/offer-view'
import type { PublicProductView } from '../../../application/mappers/product-view'
import type { UpdateCouponService } from '../../../application/update-coupon/update-coupon.service'
import type { UpdateOfferService } from '../../../application/update-offer/update-offer.service'
import type { UpdateProductService } from '../../../application/update-product/update-product.service'
import type { MicroCache } from '../../../infrastructure/cache/micro-cache'
import { assertInternalCaller, requireAdmin } from '../auth'
import {
  CreateCouponBody,
  CreateOfferBody,
  CreateProductBody,
  UpdateCouponBody,
  UpdateOfferBody,
  UpdateProductBody,
} from '../dtos'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AdminRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  createProduct: CreateProductService
  updateProduct: UpdateProductService
  createOffer: CreateOfferService
  updateOffer: UpdateOfferService
  createCoupon: CreateCouponService
  updateCoupon: UpdateCouponService
  offerCache: MicroCache<OfferView | null>
  productCache: MicroCache<PublicProductView | null>
}

/**
 * Rotas de ESCRITA (admin). O RBAC real é do gateway (JWT + role admin/staff); aqui
 * conferimos os headers `X-Auth-User-*` confiáveis (defesa em profundidade). Também
 * exigimos o `x-internal-token` (header-inject do gateway): os X-Auth-User-* só são
 * confiáveis se a chamada passou pelo gateway — sem o token, qualquer processo que
 * alcançasse o catálogo direto na rede interna forjaria um admin. `:id` non-UUID →
 * 404 direto (não existe; evita 22P02 da coluna uuid virar 500).
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  return new Elysia({ prefix: '/catalog' })
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/products',
      async ({ body, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        const view = await deps.createProduct.execute(body)
        deps.productCache.clear()
        set.status = 201
        return view
      },
      { body: CreateProductBody },
    )
    .patch(
      '/products/:id',
      async ({ body, params, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        if (!UUID_RE.test(params.id)) {
          set.status = 404
          return envelope('PRODUCT_NOT_FOUND', 'Produto não encontrado')
        }
        const result = await deps.updateProduct.execute({ id: params.id, ...body })
        deps.productCache.clear()
        deps.offerCache.clear()
        return result
      },
      { body: UpdateProductBody },
    )
    .post(
      '/offers',
      async ({ body, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        const view = await deps.createOffer.execute({
          productId: body.productId,
          code: body.code,
          slug: body.slug,
          name: body.name,
          priceCents: body.priceCents,
          compareAtPriceCents: body.compareAtPriceCents,
          currency: body.currency,
          pricingMode: body.pricingMode,
          installmentsMax: body.installmentsMax,
          trialDays: body.trialDays,
          guaranteeDays: body.guaranteeDays,
          availableFrom: parseDate(body.availableFrom),
          availableUntil: parseDate(body.availableUntil),
          content: body.content,
          metadata: body.metadata,
          status: body.status,
          items: body.items,
        })
        deps.offerCache.clear()
        set.status = 201
        return view
      },
      { body: CreateOfferBody },
    )
    .patch(
      '/offers/:id',
      async ({ body, params, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        if (!UUID_RE.test(params.id)) {
          set.status = 404
          return envelope('OFFER_NOT_FOUND', 'Oferta não encontrada')
        }
        const result = await deps.updateOffer.execute({
          id: params.id,
          name: body.name,
          priceCents: body.priceCents,
          compareAtPriceCents: body.compareAtPriceCents,
          pricingMode: body.pricingMode,
          installmentsMax: body.installmentsMax,
          trialDays: body.trialDays,
          guaranteeDays: body.guaranteeDays,
          availableFrom: parseNullableDate(body.availableFrom),
          availableUntil: parseNullableDate(body.availableUntil),
          content: body.content,
          metadata: body.metadata,
          status: body.status,
          items: body.items,
        })
        deps.offerCache.clear()
        return result
      },
      { body: UpdateOfferBody },
    )
    .post(
      '/coupons',
      async ({ body, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        const view = await deps.createCoupon.execute({
          code: body.code,
          type: body.type,
          percentOff: body.percentOff,
          amountOffCents: body.amountOffCents,
          currency: body.currency,
          status: body.status,
          appliesToAll: body.appliesToAll,
          minPurchaseCents: body.minPurchaseCents,
          maxRedemptions: body.maxRedemptions,
          validFrom: parseDate(body.validFrom),
          validUntil: parseDate(body.validUntil),
          metadata: body.metadata,
          offerIds: body.offerIds,
        })
        set.status = 201
        return view
      },
      { body: CreateCouponBody },
    )
    .patch(
      '/coupons/:id',
      async ({ body, params, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        if (!UUID_RE.test(params.id)) {
          set.status = 404
          return envelope('COUPON_NOT_FOUND', 'Cupom não encontrado')
        }
        return deps.updateCoupon.execute({
          id: params.id,
          status: body.status,
          appliesToAll: body.appliesToAll,
          minPurchaseCents: body.minPurchaseCents,
          maxRedemptions: body.maxRedemptions,
          validFrom: parseNullableDate(body.validFrom),
          validUntil: parseNullableDate(body.validUntil),
          metadata: body.metadata,
          offerIds: body.offerIds,
        })
      },
      { body: UpdateCouponBody },
    )
}

function parseDate(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new ValidationError('Data inválida (use ISO-8601)')
  return date
}

function parseNullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return parseDate(value)
}
