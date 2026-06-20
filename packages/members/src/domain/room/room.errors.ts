import { DomainError } from '../shared/errors'

/** Compra de um item/tema de quarto inexistente no catálogo. → 404. */
export class RoomItemNotFoundError extends DomainError {
  readonly code = 'ROOM_ITEM_NOT_FOUND'
  constructor(message = 'Item do quarto não encontrado') {
    super(message)
  }
}

/** Tentou COMPRAR um item/tema que já é grátis. → 400. */
export class RoomItemFreeError extends DomainError {
  readonly code = 'ROOM_ITEM_FREE'
  constructor(message = 'Esse item já é gratuito') {
    super(message)
  }
}
