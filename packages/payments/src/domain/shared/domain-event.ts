/**
 * Evento de domínio. Algo de negócio relevante que já aconteceu (nome no
 * passado). É serializado para o outbox e publicado de forma confiável.
 */
export abstract class DomainEvent {
  /** Nome estável do evento, usado para roteamento/serialização (ex.: "payment.created"). */
  abstract readonly eventName: string

  readonly occurredAt: Date

  constructor(
    public readonly aggregateId: string,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date()
  }

  /** Payload serializável (sem comportamento) gravado no outbox. */
  abstract toPayload(): Record<string, unknown>
}
