import { DomainError } from '@sistemazero/core/errors'

export class GallerySourceUnavailableError extends DomainError {
  readonly code = 'GALLERY_SOURCE_UNAVAILABLE'
  constructor() {
    super(
      'Não foi possível abrir a cópia do projeto agora. Seu trabalho foi preservado; tente novamente.',
    )
  }
}
