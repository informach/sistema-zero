import { DomainError } from '@sistemazero/core/errors'

export class StudioBuilderConflictError extends DomainError {
  readonly code = 'STUDIO_BUILDER_CONFLICT'
  constructor(message = 'Esta execução foi alterada, expirou ou não pertence a este projeto.') {
    super(message)
  }
}
