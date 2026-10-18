import { DomainError } from '@sistemazero/core/errors'

export class StudioPythonActivityUnavailableError extends DomainError {
  readonly code = 'STUDIO_PYTHON_ACTIVITY_UNAVAILABLE'
  constructor() {
    super(
      'A verificação Python está indisponível agora. Seu projeto foi preservado; tente novamente.',
    )
  }
}
