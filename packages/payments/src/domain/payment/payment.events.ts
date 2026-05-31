import { DomainEvent } from '../shared/domain-event'

export class PaymentCreatedEvent extends DomainEvent {
  readonly eventName = 'payment.created'

  constructor(
    aggregateId: string,
    private readonly data: {
      consumerId: string
      amountInCents: string
      currency: string
      method: string
      idempotencyKey: string
    },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { paymentId: this.aggregateId, ...this.data }
  }
}

export class PaymentAuthorizedEvent extends DomainEvent {
  readonly eventName = 'payment.authorized'

  constructor(
    aggregateId: string,
    private readonly data: { providerPaymentId: string },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { paymentId: this.aggregateId, ...this.data }
  }
}

export class PaymentPaidEvent extends DomainEvent {
  readonly eventName = 'payment.paid'

  constructor(
    aggregateId: string,
    private readonly data: {
      consumerId: string
      providerPaymentId: string | null
      txid: string | null
      paidAt: string
    },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { paymentId: this.aggregateId, ...this.data }
  }
}

export class PaymentFailedEvent extends DomainEvent {
  readonly eventName = 'payment.failed'

  constructor(
    aggregateId: string,
    private readonly data: { consumerId: string; reason: string },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { paymentId: this.aggregateId, ...this.data }
  }
}

export class PaymentExpiredEvent extends DomainEvent {
  readonly eventName = 'payment.expired'

  constructor(
    aggregateId: string,
    private readonly data: { consumerId: string },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    // `consumerId` é obrigatório p/ o pipeline de webhook de saída rotear ao dono.
    return { paymentId: this.aggregateId, ...this.data }
  }
}

export class PaymentRefundedEvent extends DomainEvent {
  readonly eventName = 'payment.refunded'

  constructor(
    aggregateId: string,
    private readonly data: { consumerId: string },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { paymentId: this.aggregateId, ...this.data }
  }
}
