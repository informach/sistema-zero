import type { DomainEvent } from './domain-event'
import { Entity } from './entity'

/**
 * Raiz de agregado: fronteira de consistência. Acumula eventos de domínio que a
 * camada de aplicação drena (`pullEvents`) após persistir o agregado.
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
