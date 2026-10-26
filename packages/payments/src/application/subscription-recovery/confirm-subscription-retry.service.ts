import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import {
  assertRetryConfirmationCandidate,
  readOperationConfirmation,
  type SubscriptionOperationRepository,
} from '../../domain/subscription/subscription-operation'
import type { HandleSubscriptionNotificationService } from '../handle-subscription-notification/handle-subscription-notification.service'

/** Observes a previously authorized retry; never calls retry/update/cancel on the provider. */
export class ConfirmSubscriptionRetryService {
  constructor(
    private readonly operations: SubscriptionOperationRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly cycles: HandleSubscriptionNotificationService,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    operationId: string
    expectedAttempt: number
    actorId: string
    requestId: string
  }) {
    if (
      !input.actorId?.trim() ||
      input.actorId.length > 200 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)
    )
      throw new ValidationError('Autor da conferência inválido')
    const operation = await this.operations.findById(input.operationId)
    if (!operation) throw new ValidationError('Operação não encontrada para conferência')
    if (
      operation.state === 'SUCCEEDED' &&
      operation.kind === 'RETRY' &&
      operation.confirmation?.requestId === input.requestId &&
      operation.confirmation.actorId === input.actorId.trim()
    )
      return { operationId: operation.id, confirmed: true as const }
    if (
      !Number.isSafeInteger(input.expectedAttempt) ||
      input.expectedAttempt !== operation.executionAttempts
    )
      throw new ValidationError('A operação mudou. Atualize a lista.')
    assertRetryConfirmationCandidate(operation, this.clock())
    const subscription = await this.subscriptions.findById(operation.subscriptionId)
    if (
      !subscription ||
      subscription.consumerId !== operation.consumerId ||
      subscription.provider !== this.gateway.provider ||
      subscription.providerSubscriptionId !== operation.providerSubscriptionId ||
      subscription.amount.amountInCents !== operation.amountInCents ||
      subscription.amount.currency !== operation.currency
    )
      throw new ValidationError('A origem da operação não corresponde à assinatura')
    const observation = await this.cycles.reconcileCycle(
      {
        subscriptionId: operation.providerSubscriptionId,
        chargeId: operation.providerPaymentId,
      },
      {
        subscriptionId: operation.subscriptionId,
        consumerId: operation.consumerId,
        amountInCents: operation.amountInCents,
        period: operation.retryTerms.period,
      },
    )
    if (
      observation?.status !== 'PAID' ||
      observation.providerPaymentId !== operation.providerPaymentId ||
      observation.amountInCents !== operation.amountInCents
    )
      throw new ValidationError(
        'A operadora ainda não confirma o pagamento. Nenhuma nova cobrança foi feita.',
      )
    const payment = await this.payments.findByProviderPaymentId(
      this.gateway.provider,
      operation.providerPaymentId,
    )
    const snapshot = payment?.toSnapshot()
    if (
      !payment ||
      !snapshot ||
      payment.subscriptionId !== operation.subscriptionId ||
      payment.consumerId !== operation.consumerId ||
      payment.status !== 'PAID' ||
      payment.amount.amountInCents !== operation.amountInCents ||
      payment.amount.currency !== operation.currency ||
      payment.cycleAccess?.kind !== 'VERIFIED_PERIOD' ||
      payment.cycleAccess.period.startsAt !== operation.retryTerms.period.startsAt ||
      payment.cycleAccess.period.endsAt !== operation.retryTerms.period.endsAt
    )
      throw new ValidationError('O pagamento ou seu período original ainda precisa de conferência.')
    const now = new Date(this.clock())
    const confirmation = readOperationConfirmation({
      actorId: input.actorId,
      requestId: input.requestId,
      paymentId: payment.id,
      paymentVersion: snapshot.version,
      sourceObservedAt: observation.observedAt.toISOString(),
      confirmedAt: now.toISOString(),
      period: payment.cycleAccess.period,
    })
    await this.operations.confirmPaidRetry({ operation, confirmation, now })
    return { operationId: operation.id, confirmed: true as const }
  }
}
