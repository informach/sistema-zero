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

/**
 * Boleto exige um pagador completo (nome, documento, e-mail, telefone e
 * endereço) — diferente do Pix, em que esses dados são opcionais.
 */
export class BoletoDataIncompleteError extends DomainError {
  readonly code = 'BOLETO_DATA_INCOMPLETE'

  constructor(missing: string) {
    super(`Dados obrigatórios do boleto ausentes ou inválidos: ${missing}`)
  }
}

/**
 * Cartão exige pagador com documento, e-mail, telefone, data de nascimento e
 * endereço de cobrança (a Efí rejeita a cobrança sem esses dados).
 */
export class CardDataIncompleteError extends DomainError {
  readonly code = 'CARD_DATA_INCOMPLETE'

  constructor(missing: string) {
    super(`Dados obrigatórios do cartão ausentes ou inválidos: ${missing}`)
  }
}

/** Só um pagamento PAID pode ser estornado (Pix/cartão). */
export class PaymentNotRefundableError extends DomainError {
  readonly code = 'PAYMENT_NOT_REFUNDABLE'

  constructor(status: string) {
    super(`Só é possível estornar um pagamento pago; status atual: ${status}`)
  }
}

/**
 * Estorno não suportado para este método/estado: boleto não tem estorno
 * programático na Efí, e Pix/cartão exigem o identificador do provedor.
 */
export class RefundNotSupportedError extends DomainError {
  readonly code = 'REFUND_NOT_SUPPORTED'

  constructor(reason: string) {
    super(`Estorno não suportado: ${reason}`)
  }
}

/**
 * Outro estorno do MESMO pagamento perdeu a corrida do claim otimista (ex.:
 * duplo-clique no admin) e o vencedor ainda não concluiu. O refund de cartão
 * NÃO é idempotente na Efí — melhor falhar com 409 do que estornar em dobro.
 */
export class RefundInProgressError extends DomainError {
  readonly code = 'REFUND_IN_PROGRESS'

  constructor() {
    super('Já existe um estorno deste pagamento em andamento; aguarde e recarregue')
  }
}
