import { DomainError } from '../shared/errors'

/** Config de avatar inválida (peça desconhecida ou camada incompatível). → 400. */
export class AvatarInvalidError extends DomainError {
  readonly code = 'AVATAR_INVALID'
  constructor(message = 'Configuração de avatar inválida') {
    super(message)
  }
}

/** Tentou equipar uma peça paga que ainda não possui. → 403. */
export class AvatarPartNotOwnedError extends DomainError {
  readonly code = 'AVATAR_PART_NOT_OWNED'
  constructor(message = 'Você ainda não tem essa peça do avatar') {
    super(message)
  }
}

/** Compra de uma peça inexistente no catálogo. → 404. */
export class AvatarPartNotFoundError extends DomainError {
  readonly code = 'AVATAR_PART_NOT_FOUND'
  constructor(message = 'Peça de avatar não encontrada') {
    super(message)
  }
}

/** Tentou COMPRAR uma peça que já é grátis (não há o que comprar). → 400. */
export class AvatarPartFreeError extends DomainError {
  readonly code = 'AVATAR_PART_FREE'
  constructor(message = 'Essa peça já é gratuita') {
    super(message)
  }
}
