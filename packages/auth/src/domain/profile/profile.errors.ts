import { DomainError } from '@sistemazero/core/errors'

/** Perfil inexistente ou de outra conta (mensagem única — não vaza a existência). → 404 */
export class ProfileNotFoundError extends DomainError {
  readonly code = 'PROFILE_NOT_FOUND'
  constructor() {
    super('Perfil não encontrado')
  }
}

/** A conta atingiu o teto de perfis do plano comprado (ou não comprou). → 409 */
export class ProfileLimitReachedError extends DomainError {
  readonly code = 'PROFILE_LIMIT_REACHED'
  constructor() {
    super('Limite de perfis do plano atingido')
  }
}
