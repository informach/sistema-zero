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

const ReleaseRuleSchema = t.Object({
  mode: t.Union([
    t.Literal('immediate'),
    t.Literal('days_after_purchase'),
    t.Literal('fixed_date'),
  ]),
  days: t.Optional(t.Integer({ minimum: 0 })),
  date: t.Optional(t.String({ maxLength: 40 })),
})

// Entrega exclusivamente via área de membros: `course` (um curso, courseRef),
// `all_courses` (chave-mestra ADULTA) ou `all_kids_courses` (chave-mestra KIDS) —
// cada chave-mestra cobre todos os cursos da SUA audiência, atuais e futuros.
const FulfillmentSchema = t.Object({
  accessType: t.Union([
    t.Literal('course'),
    t.Literal('all_courses'),
    t.Literal('all_kids_courses'),
  ]),
  courseRef: t.Optional(t.String({ maxLength: 200 })),
  release: t.Optional(ReleaseRuleSchema),
  // Teto de perfis liberados (plataforma kids — planos "N perfis"). Inteiro ≥ 1.
  maxProfiles: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
})

const MetadataSchema = t.Record(t.String(), t.Unknown())

// Ids que referenciam outras entidades validam o FORMATO uuid na borda (400) —
// um id lixo chegaria à coluna `uuid` do Postgres como 22P02 e viraria 500.
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const UUID = t.String({ pattern: UUID_PATTERN })

const ComponentSchema = t.Object({
  componentProductId: UUID,
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
  isPrimary: t.Optional(t.Boolean()),
})

const OfferContentSchema = t.Object({
  badge: t.Optional(t.String({ maxLength: 80 })),
  ctaLabel: t.Optional(t.String({ maxLength: 80 })),
  highlight: t.Optional(t.String({ maxLength: 200 })),
  // Opt-in: exibe o campo de cupom no checkout do funil. Ausente/false → escondido.
  allowsCoupon: t.Optional(t.Boolean()),
})

const OfferItemSchema = t.Object({
  productId: UUID,
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
})

const SKU = t.String({ minLength: 1, maxLength: 80 })
const SLUG = t.String({ minLength: 1, maxLength: 140 })
const NAME = t.String({ minLength: 1, maxLength: 200 })

// ── Query de listagem admin (paginação + filtros). `t.Numeric` coage a string da
// query para número; o handler ainda capa o `limit` (defesa). ──
const LIST_Q = t.Optional(t.String({ minLength: 1, maxLength: 120 }))
const LIST_LIMIT = t.Optional(t.Numeric({ minimum: 1, maximum: 100 }))
const LIST_OFFSET = t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 }))

/** Query de `GET /catalog/admin/products`. */
export const ListProductsQuery = t.Object({
  q: LIST_Q,
  status: t.Optional(productStatusSchema),
  limit: LIST_LIMIT,
  offset: LIST_OFFSET,
})

/** Query de `GET /catalog/admin/offers`. */
export const ListOffersQuery = t.Object({
  q: LIST_Q,
  status: t.Optional(offerStatusSchema),
  productId: t.Optional(UUID),
  limit: LIST_LIMIT,
  offset: LIST_OFFSET,
})

/** Query de `GET /catalog/admin/coupons`. */
export const ListCouponsQuery = t.Object({
  q: LIST_Q,
  status: t.Optional(couponStatusSchema),
  limit: LIST_LIMIT,
  offset: LIST_OFFSET,
})

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
  productId: UUID,
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

const OFFER_ID = UUID
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
