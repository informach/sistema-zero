import { DomainError } from '@sistemazero/core/errors'

export class GallerySourceUnavailableError extends DomainError {
  readonly code = 'GALLERY_SOURCE_UNAVAILABLE'
  constructor() {
    super(
      'Não foi possível abrir a cópia do projeto agora. Seu trabalho foi preservado; tente novamente.',
    )
  }
}

/**
 * Perfil com o Pinta causal: os desenhos pessoais só se leem pelo protocolo causal, e a galeria
 * da aula copia pela leitura antiga. Recusa explícita (decisão de 23/11/2026) até existir uma
 * listagem e uma cópia da galeria que exijam o `causal_sha256` de cada desenho.
 */
export class GalleryCausalDrawingsUnsupportedError extends DomainError {
  readonly code = 'GALLERY_PINTA_CAUSAL_UNSUPPORTED'
  constructor() {
    super('Os desenhos deste perfil não podem ser enviados pela galeria. Fale com a equipe.')
  }
}
