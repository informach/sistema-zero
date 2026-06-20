import { DomainError } from '../shared/errors'

/** Resgate de uma missão inexistente no catálogo. → 404. */
export class MissionNotFoundError extends DomainError {
  readonly code = 'MISSION_NOT_FOUND'
  constructor(message = 'Missão não encontrada') {
    super(message)
  }
}

/** Resgate antes de concluir a missão. → 409. */
export class MissionNotCompletedError extends DomainError {
  readonly code = 'MISSION_NOT_COMPLETED'
  constructor(message = 'Essa missão ainda não foi concluída') {
    super(message)
  }
}

/** Já tem o máximo de protetores de sequência. → 409. */
export class MaxFreezesError extends DomainError {
  readonly code = 'MAX_FREEZES'
  constructor(message = 'Você já tem o máximo de protetores de sequência') {
    super(message)
  }
}

/** Janela de férias inválida (datas malformadas, invertidas ou longa demais). → 400. */
export class VacationInvalidError extends DomainError {
  readonly code = 'VACATION_INVALID'
  constructor(message = 'Período de férias inválido') {
    super(message)
  }
}
