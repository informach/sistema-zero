import { DomainEvent } from '../shared/domain-event'

/**
 * Eventos da assinatura. Todo `toPayload` carrega `consumerId` porque o pipeline
 * de webhook de saída roteia a entrega ao dono pelo `consumerId` do payload.
 *
 * Observação: a cobrança de **dinheiro** de cada ciclo é notificada pelo evento
 * `payment.paid` do pagamento-ciclo (reaproveita toda a entrega de webhook). Os
 * eventos `subscription.*` aqui são de **ciclo de vida** (criada/ativada/
 * cancelada/expirada) — o `charge_paid` é informativo (não gera webhook próprio).
 */
export class SubscriptionCreatedEvent extends DomainEvent {
  readonly eventName = 'subscription.created'

  constructor(
    aggregateId: string,
    private readonly data: {
      consumerId: string
      amountInCents: string
      currency: string
      intervalMonths: number
      repeats: number | null
      idempotencyKey: string
    },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { subscriptionId: this.aggregateId, ...this.data }
  }
}

export class SubscriptionActivatedEvent extends DomainEvent {
  readonly eventName = 'subscription.activated'

  constructor(
    aggregateId: string,
    private readonly data: { consumerId: string; providerSubscriptionId: string | null },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { subscriptionId: this.aggregateId, ...this.data }
  }
}

export class SubscriptionChargePaidEvent extends DomainEvent {
  readonly eventName = 'subscription.charge_paid'

  constructor(
    aggregateId: string,
    private readonly data: {
      consumerId: string
      chargeId: string
      cyclesCompleted: number
      paidAt: string | null
    },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { subscriptionId: this.aggregateId, ...this.data }
  }
}

export class SubscriptionCanceledEvent extends DomainEvent {
  readonly eventName = 'subscription.canceled'

  constructor(
    aggregateId: string,
    private readonly data: { consumerId: string },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { subscriptionId: this.aggregateId, ...this.data }
  }
}

export class SubscriptionExpiredEvent extends DomainEvent {
  readonly eventName = 'subscription.expired'

  constructor(
    aggregateId: string,
    private readonly data: { consumerId: string },
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return { subscriptionId: this.aggregateId, ...this.data }
  }
}
