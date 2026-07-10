import type { Logger } from '@sistemazero/core/logging'
import {
  OfferAggregate,
  type OfferContent,
  type OfferItem,
} from '../../domain/offer/offer.aggregate'
import type { OfferStatus } from '../../domain/offer/offer.status'
import type { PricingMode } from '../../domain/offer/pricing-mode'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import type { ProductAggregate } from '../../domain/product/product.aggregate'
import { ProductNotFoundError } from '../../domain/product/product.errors'
import type { ResolvedEntitlement } from '../../domain/services/resolve-entitlements'
import { ValidationError } from '../../domain/shared/errors'
import type { Currency } from '../../domain/value-objects/money'
import { Sku } from '../../domain/value-objects/sku'
import { Slug } from '../../domain/value-objects/slug'
import { toEntitlementItemView } from '../mappers/entitlement-view'
import { type OfferView, toOfferView } from '../mappers/offer-view'
import { toProductSummary } from '../mappers/product-view'
import type { ResolveOfferEntitlementsService } from '../resolve-offer-entitlements/resolve-offer-entitlements.service'

export interface OfferItemInput {
  productId: string
  sortOrder?: number
}

export interface CreateOfferCommand {
  productId: string
  code: string
  slug: string
  name: string
  priceCents: number
  compareAtPriceCents?: number | null
  currency?: Currency
  pricingMode?: PricingMode
  billingIntervalMonths?: number | null
  installmentsMax?: number | null
  trialDays?: number | null
  guaranteeDays?: number | null
  availableFrom?: Date | null
  availableUntil?: Date | null
  content?: OfferContent | null
  metadata?: Record<string, unknown> | null
  status?: OfferStatus
  items?: OfferItemInput[]
}

/** Caso de uso: cadastrar uma oferta (admin). Valida o produto principal e os itens. */
export class CreateOfferService {
  constructor(
    private readonly offers: OfferRepository,
    private readonly products: ProductRepository,
    private readonly resolver: ResolveOfferEntitlementsService,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateOfferCommand): Promise<OfferView> {
    const code = Sku.create(command.code)
    const slug = Slug.create(command.slug)

    const product = await this.products.findById(command.productId)
    if (!product) throw new ProductNotFoundError('Produto principal da oferta não encontrado')

    const items = normalizeItems(command.items)
    await assertItemsExist(this.products, items)

    const offer = OfferAggregate.create({
      id: crypto.randomUUID(),
      productId: command.productId,
      code,
      slug,
      name: command.name,
      priceCents: command.priceCents,
      compareAtPriceCents: command.compareAtPriceCents,
      currency: command.currency,
      pricingMode: command.pricingMode,
      billingIntervalMonths: command.billingIntervalMonths,
      installmentsMax: command.installmentsMax,
      trialDays: command.trialDays,
      guaranteeDays: command.guaranteeDays,
      availableFrom: command.availableFrom,
      availableUntil: command.availableUntil,
      content: command.content,
      metadata: command.metadata,
      status: command.status,
      items,
    })

    const resolved = await assertActiveOfferDeliverable(offer, product, this.resolver)

    await this.offers.create(offer)
    for (const event of offer.pullEvents()) this.logger.info(event.eventName, event.toPayload())
    return toOfferView(offer, toProductSummary(product), resolved.map(toEntitlementItemView))
  }
}

export function normalizeItems(inputs: OfferItemInput[] | undefined): OfferItem[] {
  return (inputs ?? []).map((item, index) => ({
    productId: item.productId,
    sortOrder: item.sortOrder ?? index,
  }))
}

export async function assertItemsExist(
  products: ProductRepository,
  items: OfferItem[],
): Promise<void> {
  if (items.length === 0) return
  const ids = items.map((i) => i.productId)
  const found = await products.findNodesByIds(ids)
  const foundIds = new Set(found.map((n) => n.productId))
  const missing = ids.filter((id) => !foundIds.has(id))
  if (missing.length > 0) {
    throw new ValidationError(`Produtos de oferta inexistentes: ${missing.join(', ')}`)
  }
}

export async function assertActiveOfferDeliverable(
  offer: OfferAggregate,
  product: ProductAggregate,
  resolver: ResolveOfferEntitlementsService,
): Promise<ResolvedEntitlement[]> {
  const resolved = await resolver.execute(offer)
  if (offer.status !== 'active') return resolved

  if (product.status !== 'active') {
    throw new ValidationError('Oferta ativa exige produto principal ativo')
  }
  if (resolved.length === 0) {
    throw new ValidationError('Oferta ativa precisa resolver ao menos um produto entregável')
  }

  const invalid = resolved.filter(
    (item) => item.status !== 'active' || !hasDeliverableFulfillment(item),
  )
  if (invalid.length > 0) {
    throw new ValidationError(
      `Oferta ativa inclui produtos sem entrega ativa: ${invalid.map((i) => i.name).join(', ')}`,
    )
  }

  return resolved
}

function hasDeliverableFulfillment(item: ResolvedEntitlement): boolean {
  const fulfillment = item.fulfillment
  if (!fulfillment) return false
  if (
    (fulfillment.accessType === 'course' || fulfillment.accessType === 'community') &&
    !fulfillment.courseRef?.trim()
  ) {
    return false
  }
  if (
    (fulfillment.accessType === 'all_courses' || fulfillment.accessType === 'all_kids_courses') &&
    fulfillment.courseRef
  ) {
    return false
  }
  return true
}
