import { DomainError } from '../shared/errors'

export class WhatsAppInstanceNotFoundError extends DomainError {
  readonly code = 'WHATSAPP_INSTANCE_NOT_FOUND'
}

export class WhatsAppInstanceAlreadyExistsError extends DomainError {
  readonly code = 'WHATSAPP_INSTANCE_ALREADY_EXISTS'
}

/** Nenhuma instância (número) de WhatsApp habilitada/conectada para enviar. */
export class NoWhatsAppInstanceAvailableError extends DomainError {
  readonly code = 'NO_WHATSAPP_INSTANCE_AVAILABLE'
}
