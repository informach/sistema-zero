import type { Logger } from '@sistemazero/core/logging'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import type { FulfillmentSpec } from '../../domain/product/fulfillment'
import { ProductAggregate, type ProductComponent } from '../../domain/product/product.aggregate'
import type { ProductKind } from '../../domain/product/product.kind'
import type { ProductStatus } from '../../domain/product/product.status'
import { ValidationError } from '../../domain/shared/errors'
import { Sku } from '../../domain/value-objects/sku'
import { Slug } from '../../domain/value-objects/slug'
import { type ProductView, toProductView } from '../mappers/product-view'

export interface ComponentInput {
  componentProductId: string
  sortOrder?: number
  isPrimary?: boolean
}

export interface CreateProductCommand {
  sku: string
  slug: string
  name: string
  kind?: ProductKind
  description?: string | null
  status?: ProductStatus
  sellable?: boolean
  fulfillment?: FulfillmentSpec | null
  metadata?: Record<string, unknown> | null
  components?: ComponentInput[]
}

/** Caso de uso: cadastrar um produto (admin). Valida componentes referenciados. */
export class CreateProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateProductCommand): Promise<ProductView> {
    const sku = Sku.create(command.sku)
    const slug = Slug.create(command.slug)
    const components = normalizeComponents(command.components)
    await assertComponentsExist(this.products, components)

    const product = ProductAggregate.create({
      id: crypto.randomUUID(),
      sku,
      slug,
      name: command.name,
      kind: command.kind,
      description: command.description,
      status: command.status,
      sellable: command.sellable,
      fulfillment: command.fulfillment,
      metadata: command.metadata,
      components,
    })

    await this.products.create(product)
    for (const event of product.pullEvents()) this.logger.info(event.eventName, event.toPayload())
    return toProductView(product)
  }
}

export function normalizeComponents(inputs: ComponentInput[] | undefined): ProductComponent[] {
  return (inputs ?? []).map((c, index) => ({
    componentProductId: c.componentProductId,
    sortOrder: c.sortOrder ?? index,
    isPrimary: c.isPrimary ?? false,
  }))
}

export async function assertComponentsExist(
  products: ProductRepository,
  components: ProductComponent[],
): Promise<void> {
  if (components.length === 0) return
  const ids = components.map((c) => c.componentProductId)
  const found = await products.findNodesByIds(ids)
  const foundIds = new Set(found.map((n) => n.productId))
  const missing = ids.filter((id) => !foundIds.has(id))
  if (missing.length > 0) {
    throw new ValidationError(`Produtos componentes inexistentes: ${missing.join(', ')}`)
  }
}
