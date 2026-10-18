import { DomainError } from '../shared/errors'

/** Idempotent replay cannot move an existing question to a different language. */
export class ZappyQuestionContextConflictError extends DomainError {
  readonly code = 'ZAPPY_CONTEXT_CONFLICT'
  constructor() {
    super('Esta pergunta pertence a outro ambiente de programação. Envie uma nova pergunta.')
  }
}
