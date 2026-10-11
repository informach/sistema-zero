import { DomainError } from '@sistemazero/core/errors'

export class StudyAccessRequiredError extends DomainError {
  readonly code = 'STUDY_ACCESS_REQUIRED'
  constructor() {
    super('Peça um código de acesso ao seu responsável.')
  }
}

/**
 * Login do responsável com mais de 15 minutos numa ação que muda acesso ou dado sensível
 * (aparelhos, arquivar perfil, perfil público, data de nascimento). A interface trata este
 * código com o fluxo "entre de novo".
 */
export class ParentReauthenticationRequiredError extends DomainError {
  readonly code = 'PARENT_REAUTH_REQUIRED'
  constructor() {
    super('Entre novamente como responsável para confirmar esta alteração.')
  }
}

/**
 * O navegador já pertence a OUTRA família que ainda tem uma autorização viva nele. A
 * mensagem não diz nada sobre essa família (nem nomes, nem quantos perfis).
 */
export class DeviceOtherFamilyError extends DomainError {
  readonly code = 'DEVICE_OTHER_FAMILY'
  constructor() {
    super('Este navegador já está sendo usado por outra família. Use outro navegador.')
  }
}

/** Sessão do Kids (responsável ou aluno) tentando o fluxo ANTIGO de seleção/saída de perfil. */
export class KidsContextForbiddenError extends DomainError {
  readonly code = 'KIDS_CONTEXT_FORBIDDEN'
  constructor() {
    super('Esta ação não pertence à sua área.')
  }
}

/** A conferência da sessão Kids encontrou a sessão encerrada, vencida ou inválida (401). */
export class KidsSessionInvalidError extends DomainError {
  readonly code = 'KIDS_SESSION_INVALID'
  constructor() {
    super('Entre novamente para continuar.')
  }
}
