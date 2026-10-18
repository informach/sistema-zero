import { DomainError } from '@sistemazero/core/errors'

export class SectionLockedError extends DomainError {
  readonly code = 'SECTION_LOCKED'
  constructor() {
    super('Conclua a seção anterior para continuar.')
  }
}
export class SectionGateError extends DomainError {
  readonly code = 'SECTION_GATE_INCOMPLETE'
  constructor() {
    super('Conclua todas as seções da aula para continuar.')
  }
}

export class LearningConflictError extends DomainError {
  readonly code = 'LEARNING_CONFLICT'
  constructor() {
    super('Esta atividade foi atualizada. Recarregue a aula para continuar.')
  }
}
/** O projeto chegou com o código da Ponte mais novo que os blocos (o Estúdio ainda está lendo). */
export class StudioProjectSyncingError extends DomainError {
  readonly code = 'STUDIO_PROJECT_SYNCING'
  constructor() {
    super('O Estúdio ainda está organizando o seu código em blocos. Tente de novo em um instante.')
  }
}
export class LearningGateError extends DomainError {
  readonly code = 'LEARNING_GATE_INCOMPLETE'
  constructor() {
    super('Conclua as atividades essenciais indicadas nesta aula.')
  }
}
