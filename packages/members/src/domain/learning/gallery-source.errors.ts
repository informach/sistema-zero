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
 * Perfil com o Pinta causal SEM a leitura causal disponível para ele (protocolo desligado neste
 * servidor ou perfil fora da lista de QA): os desenhos pessoais só se leem pelo protocolo causal,
 * e a galeria não tem por onde conferi-los. Só o que de fato não pode ser enviado chega aqui.
 */
export class GalleryCausalDrawingsUnsupportedError extends DomainError {
  readonly code = 'GALLERY_PINTA_CAUSAL_UNSUPPORTED'
  constructor() {
    super('Os desenhos deste perfil não podem ser enviados pela galeria. Fale com a equipe.')
  }
}

/**
 * O desenho escolhido não é mais a cabeça confirmada que o seletor mostrou (outra revisão, outro
 * hash, apagado ou de outro perfil), ou a lista veio da leitura antiga e o perfil passou a ser
 * causal depois. Nada é copiado: a criança escolhe de novo e envia a versão nova.
 */
export class GalleryPintaDrawingChangedError extends DomainError {
  readonly code = 'GALLERY_PINTA_DRAWING_CHANGED'
  constructor() {
    super('Este desenho mudou. Escolha de novo para enviar a versão nova.')
  }
}

/**
 * Desenho de um escritor antigo que o protocolo causal ainda não adotou (cobertura `unknown`):
 * sem o hash certificado, a galeria não copia. Abrir o Pinta adota a unidade (backfill).
 */
export class GalleryPintaDrawingUncertifiedError extends DomainError {
  readonly code = 'GALLERY_PINTA_DRAWING_UNCERTIFIED'
  constructor() {
    super('Abra este desenho no Pinta uma vez para poder enviar.')
  }
}
