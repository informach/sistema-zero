import type { Logger } from '@sistemazero/core/logging'
import type { OfferContent } from '../../domain/offer/offer.aggregate'
import { OfferNotFoundError } from '../../domain/offer/offer.errors'
import type { OfferStatus } from '../../domain/offer/offer.status'
import type { PricingMode } from '../../domain/offer/pricing-mode'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import { ProductNotFoundError } from '../../domain/product/product.errors'
import {
  assertItemsExist,
  normalizeItems,
  type OfferItemInput,
} from '../create-offer/create-offer.service'
import { toEntitlementItemView } from '../mappers/entitlement-view'
import { type OfferView, toOfferView } from '../mappers/offer-view'
import { toProductSummary } from '../mappers/product-view'
import type { ResolveOfferEntitlementsService } from '../resolve-offer-entitlements/resolve-offer-entitlements.service'

export interface UpdateOfferCommand {
  id: string
  name?: string
  priceCents?: number
  compareAtPriceCents?: number | null
  pricingMode?: PricingMode
  installmentsMax?: number | null
  trialDays?: number | null
  guaranteeDays?: number | null
  availableFrom?: Date | null
  availableUntil?: Date | null
  content?: OfferContent | null
  metadata?: Record<string, unknown> | null
  status?: OfferStatus
  /** Se presente, SUBSTITUI os itens adicionais da oferta. */
  items?: OfferItemInput[]
}

/** Caso de uso: atualizar uma oferta (admin). Concorrência otimista no repositório. */
export class UpdateOfferService {
  constructor(
    private readonly offers: OfferRepository,
    private readonly products: ProductRepository,
    private readonly resolver: ResolveOfferEntitlementsService,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateOfferCommand): Promise<OfferView> {
    const offer = await this.offers.findById(command.id)
    if (!offer) throw new OfferNotFoundError()

    const touchesDetails =
      command.name !== undefined ||
      command.priceCents !== undefined ||
      command.compareAtPriceCents !== undefined ||
      command.pricingMode !== undefined ||
      command.installmentsMax !== undefined ||
      command.trialDays !== undefined ||
      command.guaranteeDays !== undefined ||
      command.availableFrom !== undefined ||
      command.availableUntil !== undefined ||
      command.content !== undefined ||
      command.metadata !== undefined
    if (touchesDetails) {
      offer.updateDetails({
        name: command.name,
        priceCents: command.priceCents,
        compareAtPriceCents: command.compareAtPriceCents,
        pricingMode: command.pricingMode,
        installmentsMax: command.installmentsMax,
        trialDays: command.trialDays,
        guaranteeDays: command.guaranteeDays,
        availableFrom: command.availableFrom,
        availableUntil: command.availableUntil,
        content: command.content,
        metadata: command.metadata,
      })
    }

    if (command.items !== undefined) {
      const items = normalizeItems(command.items)
      await assertItemsExist(this.products, items)
      offer.setItems(items)
    }

    if (command.status !== undefined) offer.setStatus(command.status)

    await this.offers.update(offer)
    for (const event of offer.pullEvents()) this.logger.info(event.eventName, event.toPayload())

    const product = await this.products.findById(offer.productId)
    if (!product) throw new ProductNotFoundError('Produto principal da oferta não encontrado')
    const resolved = await this.resolver.execute(offer)
    return toOfferView(offer, toProductSummary(product), resolved.map(toEntitlementItemView))
  }
}
