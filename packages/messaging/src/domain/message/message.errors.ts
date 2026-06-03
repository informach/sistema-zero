import { DomainError } from '../shared/errors'

export class MessageNotFoundError extends DomainError {
  readonly code = 'MESSAGE_NOT_FOUND'
}

/** Destinatário está na lista de supressão (hard bounce / spam / unsubscribe). */
export class RecipientSuppressedError extends DomainError {
  readonly code = 'RECIPIENT_SUPPRESSED'
}
