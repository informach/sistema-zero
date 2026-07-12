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

/** Mês do desafio fora da janela editável (corrente + 11 seguintes). → 400. */
export class ChallengeMonthInvalidError extends DomainError {
  readonly code = 'CHALLENGE_MONTH_INVALID'
  constructor(message = 'Mês fora da janela editável do desafio') {
    super(message)
  }
}

/** Tentativa de definir tema para um mês que já passou. → 400. */
export class ChallengeMonthPastError extends DomainError {
  readonly code = 'CHALLENGE_MONTH_PAST'
  constructor(message = 'Não dá para definir tema de um mês que já passou') {
    super(message)
  }
}

/** Tema (fixo ou da biblioteca) inexistente. → 404. */
export class ChallengeThemeNotFoundError extends DomainError {
  readonly code = 'CHALLENGE_THEME_NOT_FOUND'
  constructor(message = 'Tema do desafio não encontrado') {
    super(message)
  }
}

/** Tema arquivado não pode ser escolhido para um mês novo. → 409. */
export class ChallengeThemeArchivedError extends DomainError {
  readonly code = 'CHALLENGE_THEME_ARCHIVED'
  constructor(message = 'Esse tema está arquivado; reative-o para usá-lo') {
    super(message)
  }
}
