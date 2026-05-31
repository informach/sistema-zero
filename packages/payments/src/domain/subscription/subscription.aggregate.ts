import { AggregateRoot } from '../shared/aggregate-root'
import { InvalidStateTransitionError, ValidationError } from '../shared/errors'
import type { Money } from '../value-objects/money'
import type { PaymentMethod } from '../value-objects/payment-method'

/**
 * SKELETON — recorrência (pagamento recorrente). O contrato do agregado já está
 * desenhado; o fluxo completo (criação de assinatura na Efí via `/assinaturas`
 * para cartão/boleto e Pix Automático) é o próximo passo, reaproveitando os
 * mesmos ports (`PaymentGateway`). Mantido mínimo de propósito.
 */
export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export type BillingInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY'

interface SubscriptionState {
  consumerId: string
  amount: Money
  method: PaymentMethod
  interval: BillingInterval
  status: SubscriptionStatus
  cyclesCompleted: number
  maxCycles: number | null
  nextChargeAt: Date
  createdAt: Date
  updatedAt: Date
}

export class SubscriptionAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly state: SubscriptionState,
  ) {
    super(id)
  }

  static create(input: {
    id?: string
    consumerId: string
    amount: Money
    method: PaymentMethod
    interval: BillingInterval
    firstChargeAt: Date
    maxCycles?: number
  }): SubscriptionAggregate {
    if (!input.amount.isPositive()) {
      throw new ValidationError('Valor da assinatura deve ser positivo')
    }
    const now = new Date()
    return new SubscriptionAggregate(input.id ?? crypto.randomUUID(), {
      consumerId: input.consumerId,
      amount: input.amount,
      method: input.method,
      interval: input.interval,
      status: SubscriptionStatus.ACTIVE,
      cyclesCompleted: 0,
      maxCycles: input.maxCycles ?? null,
      nextChargeAt: input.firstChargeAt,
      createdAt: now,
      updatedAt: now,
    })
  }

  cancel(): void {
    if (this.state.status === SubscriptionStatus.CANCELED) return
    this.state.status = SubscriptionStatus.CANCELED
    this.state.updatedAt = new Date()
  }

  pause(): void {
    if (this.state.status !== SubscriptionStatus.ACTIVE) {
      throw new InvalidStateTransitionError('Só é possível pausar uma assinatura ativa')
    }
    this.state.status = SubscriptionStatus.PAUSED
    this.state.updatedAt = new Date()
  }

  get status(): SubscriptionStatus {
    return this.state.status
  }

  get nextChargeAt(): Date {
    return this.state.nextChargeAt
  }
}
