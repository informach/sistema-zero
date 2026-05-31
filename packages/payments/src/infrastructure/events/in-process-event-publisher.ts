import type { EventHandler, EventSubscriber } from '../../domain/ports/event-subscriber.port'
import type { EventPublisher, OutboxMessage } from '../../domain/ports/outbox.port'
import type { Logger } from '../logging/logger'

export type { EventHandler }

/**
 * Publisher in-process: entrega eventos do outbox aos handlers registrados.
 * Implementa `EventPublisher` (publica) e `EventSubscriber` (assina) — em
 * produção pode ser trocado por um adapter Kafka/RabbitMQ/Redis Streams sem
 * mudar o poller nem a aplicação.
 */
export class InProcessEventPublisher implements EventPublisher, EventSubscriber {
  private readonly handlers = new Map<string, EventHandler[]>()

  constructor(private readonly logger: Logger) {}

  on(eventName: string, handler: EventHandler): this {
    const list = this.handlers.get(eventName) ?? []
    list.push(handler)
    this.handlers.set(eventName, list)
    return this
  }

  async publish(message: OutboxMessage): Promise<void> {
    this.logger.info('event.published', {
      event: message.eventName,
      aggregateId: message.aggregateId,
    })

    const handlers = this.handlers.get(message.eventName) ?? []
    for (const handler of handlers) {
      await handler(message)
    }
  }
}
