import type { EventSubscriber } from '../../domain/ports/event-subscriber.port'
import type { EventPublisher, OutboxMessage } from '../../domain/ports/outbox.port'
import type { WebhookDeliveryRepository } from '../../domain/ports/webhook-delivery.port'
import type { Logger } from '../../infrastructure/logging/logger'

/**
 * Registra os handlers reativos aos eventos de domínio. Em `payment.paid` /
 * `payment.failed`, **enfileira uma entrega de webhook** para o consumidor dono
 * do pagamento (push), em vez de exigir polling. A entrega é processada pelo
 * `WebhookDeliveryWorker` (retry/backoff).
 */
export function registerPaymentEventHandlers(
  publisher: EventSubscriber & EventPublisher,
  deliveries: WebhookDeliveryRepository,
  logger: Logger,
): EventPublisher {
  const enqueueDelivery = async (message: OutboxMessage) => {
    const consumerId = message.payload['consumerId']
    if (typeof consumerId === 'string') {
      await deliveries.enqueue({
        consumerId,
        eventName: message.eventName,
        // O aggregateId (paymentId) torna a entrega idempotente por evento.
        dedupKey: message.aggregateId,
        payload: message.payload,
      })
    }
  }

  publisher
    .on('payment.paid', async (message) => {
      logger.info('handler.payment_paid', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })
    .on('payment.failed', async (message) => {
      logger.warn('handler.payment_failed', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })
    .on('payment.expired', (message) => {
      logger.info('handler.payment_expired', { aggregateId: message.aggregateId })
    })

  return publisher
}
