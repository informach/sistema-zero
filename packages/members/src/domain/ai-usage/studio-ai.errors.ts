import { DomainError } from '@sistemazero/core/errors'

export class StudioAiUnavailableError extends DomainError {
  readonly code = 'STUDIO_AI_UNAVAILABLE'
  constructor() {
    super('A conexão de IA está indisponível. Tente novamente mais tarde.')
  }
}
export class StudioAiConflictError extends DomainError {
  readonly code = 'STUDIO_AI_CONFLICT'
  constructor() {
    super('Esta conexão expirou ou foi alterada. Inicie uma nova conexão na área do responsável.')
  }
}
