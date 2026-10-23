import { DomainError } from '../shared/errors'

export class LiveNotFoundError extends DomainError {
  readonly code = 'LIVE_NOT_FOUND'
  constructor() {
    super('Oficina ou encontro não encontrado.')
  }
}
export class LiveAccessError extends DomainError {
  readonly code = 'LIVE_ACCESS_DENIED'
  constructor(message = 'Este encontro não está disponível para este perfil.') {
    super(message)
  }
}
export class LiveConflictError extends DomainError {
  readonly code = 'LIVE_CONFLICT'
  constructor(message = 'A sala mudou. Atualize e tente novamente.') {
    super(message)
  }
}
export class LiveUnavailableError extends DomainError {
  readonly code = 'LIVE_UNAVAILABLE'
  constructor(message = 'Este recurso ainda não está configurado.') {
    super(message)
  }
}
