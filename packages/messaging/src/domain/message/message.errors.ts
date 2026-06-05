import { DomainError } from '../shared/errors'

export class MessageNotFoundError extends DomainError {
  readonly code = 'MESSAGE_NOT_FOUND'
}

/** Destinatário está na lista de supressão (hard bounce / spam / unsubscribe). */
export class RecipientSuppressedError extends DomainError {
  readonly code = 'RECIPIENT_SUPPRESSED'
}

/**
 * Inserção colidiu com a unique de idempotência `(consumerId, idempotencyKey)`:
 * outra requisição CONCORRENTE com a mesma chave venceu a corrida check-then-insert.
 * O chamador deve recarregar a mensagem existente e devolvê-la (idempotência).
 */
export class IdempotencyConflictError extends DomainError {
  readonly code = 'IDEMPOTENCY_CONFLICT'
}
