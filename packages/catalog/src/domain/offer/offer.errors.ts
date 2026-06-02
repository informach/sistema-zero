import { DomainError } from '../shared/errors'

/** Oferta não encontrada (resolução por id/slug). → 404 */
export class OfferNotFoundError extends DomainError {
  readonly code = 'OFFER_NOT_FOUND'
  constructor(message = 'Oferta não encontrada') {
    super(message)
  }
}

/** Código ou slug de oferta já em uso (violação de unicidade). → 409 */
export class DuplicateOfferError extends DomainError {
  readonly code = 'DUPLICATE_OFFER'
  constructor(message = 'Já existe uma oferta com este código ou slug') {
    super(message)
  }
}

/**
 * Oferta existe mas não está à venda agora (status ≠ active ou fora da janela
 * `availableFrom`/`availableUntil`). Recusada na cotação — o valor autoritativo só
 * é emitido para ofertas disponíveis, então pausar/arquivar interrompe a venda. → 409
 */
export class OfferNotAvailableError extends DomainError {
  readonly code = 'OFFER_NOT_AVAILABLE'
  constructor(message = 'Esta oferta não está disponível no momento') {
    super(message)
  }
}
