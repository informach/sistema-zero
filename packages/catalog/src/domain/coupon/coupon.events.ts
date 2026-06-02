import { DomainEvent } from '../shared/domain-event'

/** Cupom criado. */
export class CouponCreatedEvent extends DomainEvent {
  readonly eventName = 'coupon.created'
  constructor(
    aggregateId: string,
    readonly couponCode: string,
  ) {
    super(aggregateId)
  }
  toPayload(): Record<string, unknown> {
    return { couponId: this.aggregateId, code: this.couponCode }
  }
}

/** Cupom atualizado (detalhes, escopo ou status). */
export class CouponUpdatedEvent extends DomainEvent {
  readonly eventName = 'coupon.updated'
  constructor(
    aggregateId: string,
    readonly change: string,
  ) {
    super(aggregateId)
  }
  toPayload(): Record<string, unknown> {
    return { couponId: this.aggregateId, change: this.change }
  }
}
