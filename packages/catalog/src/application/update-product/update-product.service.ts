import type { Logger } from '@sistemazero/core/logging'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import type { FulfillmentSpec } from '../../domain/product/fulfillment'
import { ProductNotFoundError } from '../../domain/product/product.errors'
import type { ProductKind } from '../../domain/product/product.kind'
import type { ProductStatus } from '../../domain/product/product.status'
import {
  assertComponentsExist,
  assertNoComponentCycle,
  type ComponentInput,
  normalizeComponents,
} from '../create-product/create-product.service'
import { type ProductView, toProductView } from '../mappers/product-view'

export interface UpdateProductCommand {
  id: string
  name?: string
  kind?: ProductKind
  description?: string | null
  sellable?: boolean
  fulfillment?: FulfillmentSpec | null
  metadata?: Record<string, unknown> | null
  status?: ProductStatus
  /** Se presente, SUBSTITUI a lista de componentes do combo. */
  components?: ComponentInput[]
}

/** Caso de uso: atualizar um produto (admin). Concorrência otimista no repositório. */
export class UpdateProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateProductCommand): Promise<ProductView> {
    const product = await this.products.findById(command.id)
    if (!product) throw new ProductNotFoundError()

    const touchesDetails =
      command.name !== undefined ||
      command.kind !== undefined ||
      command.description !== undefined ||
      command.sellable !== undefined ||
      command.fulfillment !== undefined ||
      command.metadata !== undefined
    if (touchesDetails) {
      product.updateDetails({
        name: command.name,
        kind: command.kind,
        description: command.description,
        sellable: command.sellable,
        fulfillment: command.fulfillment,
        metadata: command.metadata,
      })
    }

    if (command.components !== undefined) {
      const components = normalizeComponents(command.components)
      // Não permitir auto-referência já é validado no agregado; valida existência
      // e ciclo INDIRETO (A→B→…→A — resolveria para zero entregáveis na venda).
      await assertComponentsExist(this.products, components)
      await assertNoComponentCycle(this.products, command.id, components)
      product.setComponents(components)
    }

    if (command.status !== undefined) product.setStatus(command.status)

    // Coerência kind↔fulfillment↔components↔status sobre o estado CONSOLIDADO
    // (validar dentro de cada setter falharia em estados intermediários legítimos).
    product.assertCoherent()

    await this.products.update(product)
    for (const event of product.pullEvents()) this.logger.info(event.eventName, event.toPayload())
    return toProductView(product)
  }
}
