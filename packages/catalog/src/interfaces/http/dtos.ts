import { t } from 'elysia'
import { COUPON_STATUSES } from '../../domain/coupon/coupon.status'
import { COUPON_TYPES } from '../../domain/coupon/coupon.type'
import { OFFER_STATUSES } from '../../domain/offer/offer.status'
import { PRICING_MODES } from '../../domain/offer/pricing-mode'
import { PRODUCT_KINDS } from '../../domain/product/product.kind'
import { PRODUCT_STATUSES } from '../../domain/product/product.status'

const literals = <T extends readonly string[]>(values: T) =>
  t.Union(values.map((v) => t.Literal(v)))

const productKindSchema = literals(PRODUCT_KINDS)
const productStatusSchema = literals(PRODUCT_STATUSES)
const offerStatusSchema = literals(OFFER_STATUSES)
const pricingModeSchema = literals(PRICING_MODES)
const couponTypeSchema = literals(COUPON_TYPES)
const couponStatusSchema = literals(COUPON_STATUSES)

const FulfillmentAssetSchema = t.Object({
  label: t.String({ minLength: 1, maxLength: 200 }),
  url: t.Optional(t.String({ maxLength: 2000 })),
  ref: t.Optional(t.String({ maxLength: 200 })),
})

const ReleaseRuleSchema = t.Object({
  mode: t.Union([
    t.Literal('immediate'),
    t.Literal('days_after_purchase'),
    t.Literal('fixed_date'),
  ]),
  days: t.Optional(t.Integer({ minimum: 0 })),
  date: t.Optional(t.String({ maxLength: 40 })),
})

const FulfillmentSchema = t.Object({
  accessType: t.Union([
    t.Literal('download'),
    t.Literal('course'),
    t.Literal('community'),
    t.Literal('external'),
    t.Literal('none'),
  ]),
  assets: t.Optional(t.Array(FulfillmentAssetSchema)),
  courseRef: t.Optional(t.String({ maxLength: 200 })),
  release: t.Optional(ReleaseRuleSchema),
})

const MetadataSchema = t.Record(t.String(), t.Unknown())

const ComponentSchema = t.Object({
  componentProductId: t.String({ minLength: 1, maxLength: 64 }),
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
  isPrimary: t.Optional(t.Boolean()),
})

const OfferContentSchema = t.Object({
  badge: t.Optional(t.String({ maxLength: 80 })),
  ctaLabel: t.Optional(t.String({ maxLength: 80 })),
  highlight: t.Optional(t.String({ maxLength: 200 })),
})

const OfferItemSchema = t.Object({
  productId: t.String({ minLength: 1, maxLength: 64 }),
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
})

const SKU = t.String({ minLength: 1, maxLength: 80 })
const SLUG = t.String({ minLength: 1, maxLength: 140 })
const NAME = t.String({ minLength: 1, maxLength: 200 })

/** Corpo de `POST /catalog/products`. */
export const CreateProductBody = t.Object({
  sku: SKU,
  slug: SLUG,
  name: NAME,
  kind: t.Optional(productKindSchema),
  description: t.Optional(t.String({ maxLength: 5000 })),
  status: t.Optional(productStatusSchema),
  sellable: t.Optional(t.Boolean()),
  fulfillment: t.Optional(FulfillmentSchema),
  metadata: t.Optional(MetadataSchema),
  components: t.Optional(t.Array(ComponentSchema)),
})

/** Corpo de `PATCH /catalog/products/:id`. Todos os campos opcionais. */
export const UpdateProductBody = t.Object({
  name: t.Optional(NAME),
  kind: t.Optional(productKindSchema),
  description: t.Optional(t.Union([t.String({ maxLength: 5000 }), t.Null()])),
  sellable: t.Optional(t.Boolean()),
  status: t.Optional(productStatusSchema),
  fulfillment: t.Optional(t.Union([FulfillmentSchema, t.Null()])),
  metadata: t.Optional(t.Union([MetadataSchema, t.Null()])),
  components: t.Optional(t.Array(ComponentSchema)),
})

/** Corpo de `POST /catalog/offers`. */
export const CreateOfferBody = t.Object({
  productId: t.String({ minLength: 1, maxLength: 64 }),
  code: SKU,
  slug: SLUG,
  name: NAME,
  priceCents: t.Integer({ minimum: 0, maximum: 2_000_000_000 }),
  compareAtPriceCents: t.Optional(t.Integer({ minimum: 0, maximum: 2_000_000_000 })),
  currency: t.Optional(t.Literal('BRL')),
  pricingMode: t.Optional(pricingModeSchema),
  installmentsMax: t.Optional(t.Integer({ minimum: 1, maximum: 36 })),
  trialDays: t.Optional(t.Integer({ minimum: 1, maximum: 365 })),
  guaranteeDays: t.Optional(t.Integer({ minimum: 1, maximum: 365 })),
  availableFrom: t.Optional(t.String({ maxLength: 40 })),
  availableUntil: t.Optional(t.String({ maxLength: 40 })),
  content: t.Optional(OfferContentSchema),
  metadata: t.Optional(MetadataSchema),
  status: t.Optional(offerStatusSchema),
  items: t.Optional(t.Array(OfferItemSchema)),
})

const OFFER_ID = t.String({ minLength: 1, maxLength: 64 })
const CENTS = t.Integer({ minimum: 0, maximum: 2_000_000_000 })

/** Corpo de `POST /catalog/offers/:slug/quote` — aplica um cupom (opcional). */
export const QuoteOfferBody = t.Object({
  couponCode: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
})

/** Corpo de `POST /catalog/coupons`. */
export const CreateCouponBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 60 }),
  type: couponTypeSchema,
  percentOff: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  amountOffCents: t.Optional(t.Integer({ minimum: 1, maximum: 2_000_000_000 })),
  currency: t.Optional(t.Literal('BRL')),
  status: t.Optional(couponStatusSchema),
  appliesToAll: t.Optional(t.Boolean()),
  minPurchaseCents: t.Optional(CENTS),
  maxRedemptions: t.Optional(t.Integer({ minimum: 1, maximum: 1_000_000 })),
  validFrom: t.Optional(t.String({ maxLength: 40 })),
  validUntil: t.Optional(t.String({ maxLength: 40 })),
  metadata: t.Optional(MetadataSchema),
  offerIds: t.Optional(t.Array(OFFER_ID)),
})

/** Corpo de `PATCH /catalog/coupons/:id`. Não altera tipo/valor do desconto. */
export const UpdateCouponBody = t.Object({
  status: t.Optional(couponStatusSchema),
  appliesToAll: t.Optional(t.Boolean()),
  minPurchaseCents: t.Optional(t.Union([CENTS, t.Null()])),
  maxRedemptions: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 1_000_000 }), t.Null()])),
  validFrom: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
  validUntil: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
  metadata: t.Optional(t.Union([MetadataSchema, t.Null()])),
  offerIds: t.Optional(t.Array(OFFER_ID)),
})

/** Corpo de `PATCH /catalog/offers/:id`. Todos os campos opcionais. */
export const UpdateOfferBody = t.Object({
  name: t.Optional(NAME),
  priceCents: t.Optional(t.Integer({ minimum: 0, maximum: 2_000_000_000 })),
  compareAtPriceCents: t.Optional(
    t.Union([t.Integer({ minimum: 0, maximum: 2_000_000_000 }), t.Null()]),
  ),
  pricingMode: t.Optional(pricingModeSchema),
  installmentsMax: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 36 }), t.Null()])),
  trialDays: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 365 }), t.Null()])),
  guaranteeDays: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 365 }), t.Null()])),
  availableFrom: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
  availableUntil: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
  content: t.Optional(t.Union([OfferContentSchema, t.Null()])),
  metadata: t.Optional(t.Union([MetadataSchema, t.Null()])),
  status: t.Optional(offerStatusSchema),
  items: t.Optional(t.Array(OfferItemSchema)),
})
