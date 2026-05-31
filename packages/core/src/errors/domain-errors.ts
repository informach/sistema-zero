/**
 * Erros de domínio. Representam violações de invariantes/regras de negócio.
 * São distintos de erros de infraestrutura (rede, banco) e de borda (HTTP).
 */
export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    // Mantém o nome correto da subclasse no stack trace.
    this.name = new.target.name
  }
}

/** Violação de uma invariante simples (formato/valor inválido em um value object). */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
}

/** Transição de estado inválida em um agregado (ex.: pagar um pagamento já falhado). */
export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION'
}
