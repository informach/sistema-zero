import { DomainError } from '@sistemazero/core/errors'

/**
 * Token de redefinição ausente, desconhecido, já consumido ou de usuário
 * inexistente. Mensagem GENÉRICA de propósito (não revela qual caso). → 401
 */
export class InvalidResetTokenError extends DomainError {
  readonly code = 'INVALID_RESET_TOKEN'
  constructor() {
    super('Link de redefinição inválido ou já utilizado')
  }
}

/** Token de redefinição expirado (TTL curto). O usuário deve pedir um novo. → 401 */
export class ResetTokenExpiredError extends DomainError {
  readonly code = 'RESET_TOKEN_EXPIRED'
  constructor() {
    super('Link de redefinição expirado; solicite um novo')
  }
}
