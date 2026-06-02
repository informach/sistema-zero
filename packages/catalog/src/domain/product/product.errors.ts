import { DomainError } from '../shared/errors'

/** Produto não encontrado (resolução por id/slug/sku). → 404 */
export class ProductNotFoundError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND'
  constructor(message = 'Produto não encontrado') {
    super(message)
  }
}

/** SKU ou slug de produto já em uso (violação de unicidade). → 409 */
export class DuplicateProductError extends DomainError {
  readonly code = 'DUPLICATE_PRODUCT'
  constructor(message = 'Já existe um produto com este SKU ou slug') {
    super(message)
  }
}
