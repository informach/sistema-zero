import { DomainError } from '../shared/errors'

export class SenderNotFoundError extends DomainError {
  readonly code = 'SENDER_NOT_FOUND'
}

export class SenderAlreadyExistsError extends DomainError {
  readonly code = 'SENDER_ALREADY_EXISTS'
}

/** Nenhum remetente de e-mail habilitado (nem o pedido, nem um default). */
export class NoSenderAvailableError extends DomainError {
  readonly code = 'NO_SENDER_AVAILABLE'
}
