import { DomainError } from '@sistemazero/core/errors'

/**
 * Código OTP ausente, errado, expirado, já usado, com tentativas esgotadas ou de
 * conta inexistente/inativa. Mensagem GENÉRICA de propósito (não revela qual caso
 * nem se a conta existe — anti-enumeração). → 401
 */
export class InvalidOtpError extends DomainError {
  readonly code = 'INVALID_OTP'
  constructor() {
    super('Código inválido ou expirado')
  }
}
