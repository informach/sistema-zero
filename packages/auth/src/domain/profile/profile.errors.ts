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

/** Novo perfil com 18 anos completos ou mais não pertence à plataforma Kids. → 400 */
export class ProfileAgeRestrictedError extends DomainError {
  readonly code = 'PROFILE_AGE_RESTRICTED'
  constructor() {
    super('Esta comunidade é para crianças menores de 18 anos')
  }
}
