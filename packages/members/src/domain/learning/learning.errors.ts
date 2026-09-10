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
export class LearningGateError extends DomainError {
  readonly code = 'LEARNING_GATE_INCOMPLETE'
  constructor() {
    super('Conclua as atividades essenciais indicadas nesta aula.')
  }
}
