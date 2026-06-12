import type { ConsumerRepository } from '../../domain/ports/consumer-repository.port'
import type { EventSubscriber } from '../../domain/ports/event-subscriber.port'
import type { EventPublisher, OutboxMessage } from '../../domain/ports/outbox.port'
import type { WebhookDeliveryRepository } from '../../domain/ports/webhook-delivery.port'
import type { Logger } from '../../infrastructure/logging/logger'

/**
 * Registra os handlers reativos aos eventos de domínio. Em `payment.paid` /
 * `payment.failed`, **enfileira uma entrega de webhook** para o consumidor dono
 * do pagamento (push), em vez de exigir polling. A entrega é processada pelo
 * `WebhookDeliveryWorker` (retry/backoff).
 *
 * FAN-OUT: além do dono, o evento é entregue a todo consumer INSCRITO no nome
 * do evento (`consumers.subscribed_events` — ex.: o serviço fiscal assina
 * `payment.paid`/`payment.refunded` para emitir/cancelar NFS-e). A unique
 * `(consumer_id, event_name, dedup_key)` de `webhook_deliveries` torna a
 * republicação do outbox idempotente POR consumer, então o fan-out é seguro
 * sob entrega ≥1 vez. Falha ao resolver subscribers NÃO derruba a entrega ao
 * dono (logada; a republicação do outbox re-tenta o fan-out).
 */
export function registerPaymentEventHandlers(
  publisher: EventSubscriber & EventPublisher,
  deliveries: WebhookDeliveryRepository,
  consumers: ConsumerRepository,
  logger: Logger,
): EventPublisher {
  const enqueueDelivery = async (message: OutboxMessage) => {
    const ownerId =
      typeof message.payload.consumerId === 'string' ? message.payload.consumerId : null
    if (ownerId) {
      await deliveries.enqueue({
        consumerId: ownerId,
        eventName: message.eventName,
        // O aggregateId (paymentId) torna a entrega idempotente por evento.
        dedupKey: message.aggregateId,
        payload: message.payload,
      })
    }

    let subscribers: Awaited<ReturnType<ConsumerRepository['findSubscribers']>>
    try {
      subscribers = await consumers.findSubscribers(message.eventName)
    } catch (error) {
      logger.error('webhook.fanout_lookup_failed', {
        eventName: message.eventName,
        aggregateId: message.aggregateId,
        error: error instanceof Error ? error.message : String(error),
      })
      return
    }
    for (const subscriber of subscribers) {
      if (subscriber.id === ownerId) continue
      await deliveries.enqueue({
        consumerId: subscriber.id,
        eventName: message.eventName,
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
    .on('payment.expired', async (message) => {
      logger.info('handler.payment_expired', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })
    .on('payment.refunded', async (message) => {
      logger.info('handler.payment_refunded', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })
    // Eventos de ciclo de vida da assinatura. A cobrança de DINHEIRO de cada ciclo
    // já é notificada pelo `payment.paid` do pagamento-ciclo, então NÃO enfileiramos
    // `subscription.charge_paid` (redundante). Cada evento abaixo dispara uma vez por
    // assinatura → `dedupKey = aggregateId` (subscriptionId) é suficiente.
    .on('subscription.activated', async (message) => {
      logger.info('handler.subscription_activated', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })
    .on('subscription.canceled', async (message) => {
      logger.info('handler.subscription_canceled', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })
    .on('subscription.expired', async (message) => {
      logger.info('handler.subscription_expired', { aggregateId: message.aggregateId })
      await enqueueDelivery(message)
    })

  return publisher
}
