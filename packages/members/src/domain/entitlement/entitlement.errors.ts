import { DomainError } from '../shared/errors'

export class EntitlementNotFoundError extends DomainError {
  readonly code = 'ENTITLEMENT_NOT_FOUND'
  constructor(message = 'Matrícula não encontrada') {
    super(message)
  }
}

/** O aluno não tem direito de acesso ativo ao recurso pedido. Mapeada para 403. */
export class AccessDeniedError extends DomainError {
  readonly code = 'ACCESS_DENIED'
  constructor(message = 'Você não tem acesso a este conteúdo') {
    super(message)
  }
}

/** Já existe uma matrícula manual (ex.: revogada) que impede a concessão. → 409. */
export class EntitlementConflictError extends DomainError {
  readonly code = 'ENTITLEMENT_CONFLICT'
  constructor(message = 'Conflito de matrícula') {
    super(message)
  }
}

/** A oferta informada na concessão manual não existe no catálogo. → 404. */
export class OfferNotFoundError extends DomainError {
  readonly code = 'OFFER_NOT_FOUND'
  constructor(message = 'Oferta não encontrada no catálogo') {
    super(message)
  }
}

/** Comando de gestão de matrícula inválido (ex.: estender sem validade). → 400. */
export class InvalidEntitlementCommandError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
}
