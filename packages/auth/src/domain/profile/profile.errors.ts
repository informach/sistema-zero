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

/**
 * A equipe de suporte tentou LIGAR a fala da criança: só os responsáveis consentem. → 403.
 * Guarda do agregado (defesa em profundidade): a régua da aplicação já recusa antes, com
 * `FORBIDDEN` e a mesma mensagem.
 */
export class VoiceInputSupportCannotEnableError extends DomainError {
  readonly code = 'VOICE_INPUT_SUPPORT_CANNOT_ENABLE'
  constructor() {
    super(
      'Só os responsáveis podem ligar a fala da criança. A equipe de suporte pode apenas desligar.',
    )
  }
}

/** Novo perfil com 18 anos completos ou mais não pertence à plataforma Kids. → 400 */
export class ProfileAgeRestrictedError extends DomainError {
  readonly code = 'PROFILE_AGE_RESTRICTED'
  constructor() {
    super('Esta comunidade é para crianças menores de 18 anos')
  }
}
