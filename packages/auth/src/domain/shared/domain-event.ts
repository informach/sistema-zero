/**
 * Evento de domínio. Algo de negócio relevante que já aconteceu (nome no
 * passado). Aqui é usado para observabilidade (log) — o serviço de identidade
 * ainda não publica eventos para consumidores externos.
 */
export abstract class DomainEvent {
  /** Nome estável do evento (ex.: "user.registered"). */
  abstract readonly eventName: string

  readonly occurredAt: Date

  constructor(
    public readonly aggregateId: string,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date()
  }

  /** Payload serializável (sem comportamento). */
  abstract toPayload(): Record<string, unknown>
}
