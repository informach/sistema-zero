import { DomainEvent } from '../shared/domain-event'

/** Oferta criada. */
export class OfferCreatedEvent extends DomainEvent {
  readonly eventName = 'offer.created'
  constructor(
    aggregateId: string,
    readonly code: string,
    readonly productId: string,
    readonly priceCents: number,
  ) {
    super(aggregateId)
  }
  toPayload(): Record<string, unknown> {
    return {
      offerId: this.aggregateId,
      code: this.code,
      productId: this.productId,
      priceCents: this.priceCents,
    }
  }
}

/** Oferta atualizada (detalhes, itens ou status). */
export class OfferUpdatedEvent extends DomainEvent {
  readonly eventName = 'offer.updated'
  constructor(
    aggregateId: string,
    readonly change: string,
  ) {
    super(aggregateId)
  }
  toPayload(): Record<string, unknown> {
    return { offerId: this.aggregateId, change: this.change }
  }
}
