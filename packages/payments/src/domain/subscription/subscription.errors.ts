import { DomainError } from '../shared/errors'

/** Assinatura não encontrada pelo identificador informado. */
export class SubscriptionNotFoundError extends DomainError {
  readonly code = 'SUBSCRIPTION_NOT_FOUND'

  constructor(identifier: string) {
    super(`Assinatura não encontrada: ${identifier}`)
  }
}

/**
 * Assinatura de cartão exige pagador completo (nome, documento, e-mail, telefone,
 * data de nascimento) + endereço de cobrança — a Efí rejeita a assinatura sem
 * esses dados (mesmas exigências da cobrança de cartão avulsa).
 */
export class SubscriptionDataIncompleteError extends DomainError {
  readonly code = 'SUBSCRIPTION_DATA_INCOMPLETE'

  constructor(missing: string) {
    super(`Dados obrigatórios da assinatura ausentes ou inválidos: ${missing}`)
  }
}
