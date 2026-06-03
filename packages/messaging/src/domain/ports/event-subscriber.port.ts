import type { OutboxMessage } from './outbox.port'

export type EventHandler = (message: OutboxMessage) => Promise<void> | void

/**
 * Port (driven) de **assinatura** de eventos de domínio. A camada de aplicação
 * registra handlers por aqui sem depender de uma implementação concreta
 * (in-process, Kafka, etc.) — mantém a regra de dependência apontando p/ dentro.
 */
export interface EventSubscriber {
  on(eventName: string, handler: EventHandler): EventSubscriber
}
