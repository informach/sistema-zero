import { DomainError } from '@sistemazero/core/errors'

/** Ator sem permissão para impersonar o alvo (matriz: admin só customer/staff). → 403 */
export class ImpersonationForbiddenError extends DomainError {
  readonly code = 'IMPERSONATION_FORBIDDEN'
  constructor() {
    super('Sem permissão para impersonar este usuário')
  }
}

/** Alvo não pode receber sessão impersonada (conta inativa/suspensa/bloqueada). → 409 */
export class TargetNotImpersonableError extends DomainError {
  readonly code = 'TARGET_NOT_IMPERSONABLE'
  constructor() {
    super('Usuário-alvo não pode ser impersonado (conta inativa)')
  }
}

/** Token de handoff ausente/expirado/já consumido (mensagem única — não vaza o motivo). → 401 */
export class InvalidImpersonationTokenError extends DomainError {
  readonly code = 'INVALID_IMPERSONATION_TOKEN'
  constructor() {
    super('Token de impersonação inválido ou expirado')
  }
}
