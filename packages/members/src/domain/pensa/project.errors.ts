import { DomainError } from '../shared/errors'

export class PensaProjectError extends DomainError {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export function pensaError(code: string, message: string): never {
  throw new PensaProjectError(code, message)
}

export class PensaQuotaError extends PensaProjectError {
  constructor(message: string) {
    super('QUOTA_EXCEEDED', message)
  }
}

export class PensaReservationConflictError extends PensaProjectError {
  constructor(message = 'Este pedido mudou. Retome pela versão atual.') {
    super('REVISION_CONFLICT', message)
  }
}
