import { PaymentAggregate } from '../../domain/payment/payment.aggregate'
import type { ProviderChargeStatus } from '../../domain/ports/payment-gateway.port'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import { Customer } from '../../domain/value-objects/customer'
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key'
import { PaymentMethod } from '../../domain/value-objects/payment-method'

/**
 * Constrói o **pagamento de um ciclo** de assinatura como um `PaymentAggregate` de
 * cartão (sem token — a Efí já cobrou o cartão guardado), ligado à assinatura-pai.
 * Reaproveita todo o pipeline de pagamento (outbox, evento `payment.paid`, entrega
 * de webhook ao consumidor). A `idempotencyKey` sintética + a unique
 * (consumerId, idempotencyKey) deduplicam a criação do ciclo entre entregas/réplicas.
 */
export function buildCyclePayment(input: {
  subscription: SubscriptionAggregate
  chargeId: string
  status: ProviderChargeStatus
  paidAt?: Date
}): PaymentAggregate {
  const { subscription, chargeId, status, paidAt } = input

  const customer = subscription.customer
    ? Customer.create({
        name: subscription.customer.name,
        email: subscription.customer.email,
        document: subscription.customer.document.value,
        phone: subscription.customer.phone,
        address: subscription.customer.address,
      })
    : undefined

  const payment = PaymentAggregate.create({
    consumerId: subscription.consumerId,
    amount: subscription.amount,
    method: PaymentMethod.recurringCard(subscription.card),
    idempotencyKey: IdempotencyKey.create(`sub:${subscription.id}:charge:${chargeId}`),
    customer,
    metadata: { subscriptionId: subscription.id },
    subscriptionId: subscription.id,
  })

  payment.registerProviderCharge({ providerPaymentId: chargeId })

  if (status === 'PAID') payment.markPaid(paidAt)
  else if (status === 'FAILED') payment.markFailed('Cobrança recorrente recusada pelo provedor')
  // PENDING (em análise): fica PENDING; a reconciliação/notificação fecha depois.

  return payment
}
