import { Entity } from './entity'
import type { DomainEvent } from './domain-event'

/**
 * Raiz de agregado: fronteira de consistência transacional. Acumula eventos de
 * domínio que a camada de aplicação drena (`pullEvents`) e grava no outbox na
 * MESMA transação da persistência do agregado.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _events: DomainEvent[] = []

  protected addEvent(event: DomainEvent): void {
    this._events.push(event)
  }

  /** Retorna e limpa os eventos acumulados (drena). */
  pullEvents(): DomainEvent[] {
    const events = this._events
    this._events = []
    return events
  }

  get events(): readonly DomainEvent[] {
    return this._events
  }
}
