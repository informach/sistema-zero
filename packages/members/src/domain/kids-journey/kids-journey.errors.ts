import { DomainError } from '../shared/errors'

export class KidsJourneyInitializingError extends DomainError {
  readonly code = 'KIDS_JOURNEY_INITIALIZING'
  constructor() {
    super('A jornada está sendo preparada. Tente novamente em instantes.')
  }
}

export class KidsJourneyUnavailableError extends DomainError {
  readonly code = 'KIDS_JOURNEY_UNAVAILABLE'
  constructor(cause?: unknown) {
    super('A jornada está temporariamente indisponível. Tente novamente em instantes.')
    if (cause !== undefined) this.cause = cause
  }
}

/** Explicit retry by the author; no automatic transaction/background retry. */
export class KidsJourneyCatalogBusyError extends DomainError {
  readonly code = 'KIDS_JOURNEY_CATALOG_BUSY'
  constructor() {
    super('O catálogo está sendo atualizado. Aguarde a edição terminar e tente publicar novamente.')
  }
}

export class KidsJourneyConflictError extends DomainError {
  readonly code = 'KIDS_JOURNEY_CONFLICT'
  constructor() {
    super('A jornada mudou. Atualize a configuração e prepare a publicação novamente.')
  }
}

export class KidsJourneyPreparationMissingError extends DomainError {
  readonly code = 'KIDS_JOURNEY_PREPARATION_MISSING'
  constructor() {
    super('Esta preparação da jornada não está disponível.')
  }
}
