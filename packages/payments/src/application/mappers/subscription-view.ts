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
  /**
   * Pagamento do 1º CICLO quando a criação já o expôs (o funil linka o
   * `paymentId` ao lead sem esperar o webhook). Ausente/null nas leituras
   * posteriores — os ciclos são consultáveis via `payment.paid`.
   */
  firstPayment?: { id: string; status: string } | null
}

/**
 * View PÚBLICA de "minhas assinaturas" (self-service do assinante): sem
 * consumerId/metadata/providerSubscriptionId (internos de operação).
 */
export interface MySubscriptionView {
  id: string
  status: SubscriptionStatus
  intervalMonths: number
  repeats: number | null
  amountInCents: string
  currency: string
  card: { brand: string; last4: string }
  cyclesCompleted: number
  lastChargeAt: string | null
  description: string | null
  canceledAt: string | null
  createdAt: string
}

export function toMySubscriptionView(subscription: SubscriptionAggregate): MySubscriptionView {
  return {
    id: subscription.id,
    status: subscription.status,
    intervalMonths: subscription.intervalMonths,
    repeats: subscription.repeats,
    amountInCents: subscription.amount.amountInCents.toString(),
    currency: subscription.amount.currency,
    card: { brand: subscription.card.brand, last4: subscription.card.last4 },
    cyclesCompleted: subscription.cyclesCompleted,
    lastChargeAt: subscription.lastChargeAt ? subscription.lastChargeAt.toISOString() : null,
    description: subscription.description,
    canceledAt: subscription.canceledAt ? subscription.canceledAt.toISOString() : null,
    createdAt: subscription.createdAt.toISOString(),
  }
}

export function toSubscriptionView(
  subscription: SubscriptionAggregate,
  firstPayment?: { id: string; status: string } | null,
): SubscriptionView {
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
    firstPayment: firstPayment ?? null,
  }
}
