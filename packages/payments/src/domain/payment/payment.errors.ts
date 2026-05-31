import { DomainError } from '../shared/errors'

/** Pagamento não encontrado pelo identificador informado. */
export class PaymentNotFoundError extends DomainError {
  readonly code = 'PAYMENT_NOT_FOUND'

  constructor(identifier: string) {
    super(`Pagamento não encontrado: ${identifier}`)
  }
}

/**
 * A mesma `Idempotency-Key` foi reutilizada com um corpo de requisição
 * diferente — indica erro do consumidor (não é seguro reaproveitar a resposta).
 */
export class IdempotencyConflictError extends DomainError {
  readonly code = 'IDEMPOTENCY_CONFLICT'

  constructor() {
    super('Idempotency-Key reutilizada com um payload diferente')
  }
}

/** Uma requisição com a mesma chave ainda está sendo processada. */
export class IdempotencyInFlightError extends DomainError {
  readonly code = 'IDEMPOTENCY_IN_FLIGHT'

  constructor() {
    super('Já existe uma operação em andamento para esta Idempotency-Key')
  }
}

/** Forma de pagamento válida, mas ainda sem adapter implementado nesta versão. */
export class UnsupportedPaymentMethodError extends DomainError {
  readonly code = 'UNSUPPORTED_PAYMENT_METHOD'

  constructor(method: string) {
    super(`Forma de pagamento ainda não suportada: ${method}`)
  }
}
