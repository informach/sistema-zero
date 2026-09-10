import { DomainError } from '@sistemazero/core/errors'

export class LessonDraftConflictError extends DomainError {
  readonly code = 'LESSON_DRAFT_CONFLICT'
  constructor() {
    super(
      'Esta aula foi alterada em outra aba ou por outro autor. Sua cópia local foi preservada. Reabra a versão atual para reconciliar as alterações.',
    )
  }
}
