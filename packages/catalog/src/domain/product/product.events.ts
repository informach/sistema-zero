import { DomainEvent } from '../shared/domain-event'
import type { ProductKind } from './product.kind'

/** Produto criado. */
export class ProductCreatedEvent extends DomainEvent {
  readonly eventName = 'product.created'
  constructor(
    aggregateId: string,
    readonly sku: string,
    readonly kind: ProductKind,
  ) {
    super(aggregateId)
  }
  toPayload(): Record<string, unknown> {
    return { productId: this.aggregateId, sku: this.sku, kind: this.kind }
  }
}

/** Produto atualizado (detalhes, componentes ou status). */
export class ProductUpdatedEvent extends DomainEvent {
  readonly eventName = 'product.updated'
  constructor(
    aggregateId: string,
    readonly change: string,
  ) {
    super(aggregateId)
  }
  toPayload(): Record<string, unknown> {
    return { productId: this.aggregateId, change: this.change }
  }
}
