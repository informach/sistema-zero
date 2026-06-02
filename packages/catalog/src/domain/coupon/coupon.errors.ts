import { DomainError } from '../shared/errors'

/** Cupom não encontrado (código inexistente). → 404 */
export class CouponNotFoundError extends DomainError {
  readonly code = 'COUPON_NOT_FOUND'
  constructor(message = 'Cupom não encontrado') {
    super(message)
  }
}

/** Código de cupom já em uso (violação de unicidade). → 409 */
export class DuplicateCouponError extends DomainError {
  readonly code = 'DUPLICATE_COUPON'
  constructor(message = 'Já existe um cupom com este código') {
    super(message)
  }
}

/**
 * Cupom existe mas não pode ser aplicado (inativo, fora da validade, esgotado,
 * fora do escopo da oferta ou abaixo do mínimo). → 422 (mensagem específica).
 */
export class CouponNotApplicableError extends DomainError {
  readonly code = 'COUPON_NOT_APPLICABLE'
  constructor(message = 'Cupom não aplicável a esta oferta') {
    super(message)
  }
}

/** Cupom esgotado (atingiu o limite de usos). → 422 */
export class CouponExhaustedError extends DomainError {
  readonly code = 'COUPON_EXHAUSTED'
  constructor(message = 'Cupom esgotado') {
    super(message)
  }
}
