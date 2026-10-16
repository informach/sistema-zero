import { DomainError } from '@sistemazero/core/errors'
export class WorkspaceError extends DomainError {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
