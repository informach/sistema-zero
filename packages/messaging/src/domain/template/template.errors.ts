import { DomainError } from '../shared/errors'

export class TemplateNotFoundError extends DomainError {
  readonly code = 'TEMPLATE_NOT_FOUND'
}

export class TemplateAlreadyExistsError extends DomainError {
  readonly code = 'TEMPLATE_ALREADY_EXISTS'
}

/** Renderização pediu um template cujas variáveis obrigatórias não vieram. */
export class MissingTemplateVariableError extends DomainError {
  readonly code = 'MISSING_TEMPLATE_VARIABLE'

  constructor(readonly missing: string[]) {
    super(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`)
  }
}
