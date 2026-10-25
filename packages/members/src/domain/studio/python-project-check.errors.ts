import { DomainError } from '@sistemazero/core/errors'

export class StudioPythonProjectCheckUnavailableError extends DomainError {
  readonly code = 'STUDIO_PYTHON_PROJECT_CHECK_UNAVAILABLE'
  constructor() {
    super(
      'A verificação Python está indisponível agora. Seu projeto foi preservado; tente novamente.',
    )
  }
}
