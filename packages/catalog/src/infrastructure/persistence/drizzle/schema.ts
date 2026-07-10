import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { OfferContent } from '../../../domain/offer/offer.aggregate'
import type { FulfillmentSpec } from '../../../domain/product/fulfillment'

// Este package compartilha o MESMO Postgres do payments/auth/funnel, mas é dono do
// schema `catalog` (isolamento por `pgSchema`). Todo o DDL gerado fica em `catalog.*`.
export const catalog = pgSchema('catalog')

export const productKindEnum = catalog.enum('product_kind', [
  'ebook',
  'course',
  'template_kit',
  'community',
  'service',
  'bundle',
  'tool',
  'other',
])
export const productStatusEnum = catalog.enum('product_status', ['draft', 'active', 'archived'])
export const offerStatusEnum = catalog.enum('offer_status', [
  'draft',
  'active',
  'paused',
  'archived',
])
export const pricingModeEnum = catalog.enum('pricing_mode', ['one_time', 'subscription'])
export const couponTypeEnum = catalog.enum('coupon_type', ['percent', 'fixed'])
export const couponStatusEnum = catalog.enum('coupon_status', ['active', 'inactive', 'archived'])

/** Produtos: o entregável / fonte da verdade do conteúdo. SEM preço (vive na oferta). */
export const products = catalog.table(
  'products',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    sku: text('sku').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    kind: productKindEnum('kind').notNull().default('other'),
    description: text('description'),
    status: productStatusEnum('status').notNull().default('draft'),
    // false = material entregue só dentro de combo/oferta (nunca vendido sozinho).
    sellable: boolean('sellable').notNull().default(true),
    currency: text('currency').notNull().default('BRL'),
    // O que a área de membros precisa para liberar (estruturado em JSON).
    fulfillment: jsonb('fulfillment').$type<FulfillmentSpec>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('products_sku_uq').on(t.sku), uniqueIndex('products_slug_uq').on(t.slug)],
)

/**
 * Composição de combos (auto-referencial): `product_id` (o combo) inclui
 * `component_product_id`. `is_primary` marca o "principal" (destacado na venda).
 */
export const productComponents = catalog.table(
  'product_components',
  {
    id: uuid('id').primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // FK auto-referencial para a MESMA tabela (precisa do tipo de retorno explícito).
    componentProductId: uuid('component_product_id')
      .notNull()
      .references((): AnyPgColumn => products.id),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [
    uniqueIndex('product_components_uq').on(t.productId, t.componentProductId),
    index('product_components_product_idx').on(t.productId),
  ],
)

/** Ofertas: a unidade de venda. Carrega o PREÇO. 1 produto → N ofertas. */
export const offers = catalog.table(
  'offers',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    code: text('code').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    status: offerStatusEnum('status').notNull().default('draft'),
    priceCents: integer('price_cents').notNull(),
    compareAtPriceCents: integer('compare_at_price_cents'),
    currency: text('currency').notNull().default('BRL'),
    pricingMode: pricingModeEnum('pricing_mode').notNull().default('one_time'),
    // Periodicidade da ASSINATURA em meses (mensal=1, anual=12). Null em one_time;
    // oferta subscription ATIVA exige o valor (invariante no agregado). É o
    // `intervalMonths` do plano Efí que o funil manda ao payments.
    billingIntervalMonths: integer('billing_interval_months'),
    installmentsMax: integer('installments_max'),
    trialDays: integer('trial_days'),
    guaranteeDays: integer('guarantee_days'),
    availableFrom: timestamp('available_from', { withTimezone: true }),
    availableUntil: timestamp('available_until', { withTimezone: true }),
    // Núcleo comercial de apresentação (a copy longa fica no funil).
    content: jsonb('content').$type<OfferContent>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('offers_code_uq').on(t.code),
    uniqueIndex('offers_slug_uq').on(t.slug),
    index('offers_product_idx').on(t.productId),
  ],
)

/** Produtos adicionais que a OFERTA concede além do principal (variação por oferta). */
export const offerItems = catalog.table(
  'offer_items',
  {
    id: uuid('id').primaryKey(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('offer_items_uq').on(t.offerId, t.productId),
    index('offer_items_offer_idx').on(t.offerId),
  ],
)

/** Cupons: desconto (percentual ou fixo) aplicável ao preço da oferta. */
export const coupons = catalog.table(
  'coupons',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    code: text('code').notNull(),
    type: couponTypeEnum('type').notNull(),
    percentOff: integer('percent_off'),
    amountOffCents: integer('amount_off_cents'),
    currency: text('currency').notNull().default('BRL'),
    status: couponStatusEnum('status').notNull().default('active'),
    // true = vale para qualquer oferta ativa; false = restrito a `coupon_offers`.
    appliesToAll: boolean('applies_to_all').notNull().default(false),
    minPurchaseCents: integer('min_purchase_cents'),
    maxRedemptions: integer('max_redemptions'),
    timesRedeemed: integer('times_redeemed').notNull().default(0),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('coupons_code_uq').on(t.code)],
)

/** Escopo do cupom: ofertas específicas (quando não `applies_to_all`). */
export const couponOffers = catalog.table(
  'coupon_offers',
  {
    id: uuid('id').primaryKey(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('coupon_offers_uq').on(t.couponId, t.offerId),
    index('coupon_offers_coupon_idx').on(t.couponId),
  ],
)

export const couponRedemptions = catalog.table(
  'coupon_redemptions',
  {
    id: uuid('id').primaryKey(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('coupon_redemptions_uq').on(t.couponId, t.idempotencyKey),
    index('coupon_redemptions_coupon_idx').on(t.couponId),
  ],
)

export const schema = {
  products,
  productComponents,
  offers,
  offerItems,
  coupons,
  couponOffers,
  couponRedemptions,
}
