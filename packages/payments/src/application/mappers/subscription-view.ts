import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import type { SubscriptionStatus } from '../../domain/subscription/subscription.status'

/** Representação de leitura de uma assinatura, exposta na API (sem dados sensíveis). */
export interface SubscriptionView {
  id: string
  consumerId: string
  status: SubscriptionStatus
  intervalMonths: number
  /** Total de cobranças; null = ilimitado. */
  repeats: number | null
  amountInCents: string
  currency: string
  /** Dados seguros do cartão (NUNCA token/PAN — só bandeira/últimos dígitos). */
  card: { brand: string; last4: string }
  cyclesCompleted: number
  lastChargeAt: string | null
  description: string | null
  metadata: Record<string, unknown>
  providerSubscriptionId: string | null
  canceledAt: string | null
  createdAt: string
}

export function toSubscriptionView(subscription: SubscriptionAggregate): SubscriptionView {
  return {
    id: subscription.id,
    consumerId: subscription.consumerId,
    status: subscription.status,
    intervalMonths: subscription.intervalMonths,
    repeats: subscription.repeats,
    amountInCents: subscription.amount.amountInCents.toString(),
    currency: subscription.amount.currency,
    card: { brand: subscription.card.brand, last4: subscription.card.last4 },
    cyclesCompleted: subscription.cyclesCompleted,
    lastChargeAt: subscription.lastChargeAt ? subscription.lastChargeAt.toISOString() : null,
    description: subscription.description,
    metadata: subscription.metadata,
    providerSubscriptionId: subscription.providerSubscriptionId,
    canceledAt: subscription.canceledAt ? subscription.canceledAt.toISOString() : null,
    createdAt: subscription.createdAt.toISOString(),
  }
}
