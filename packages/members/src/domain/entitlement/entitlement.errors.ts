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
