import type { HelpValidationIssue } from '@sistemazero/core/help'
import { DomainError } from '../shared/errors'

/** Tutorial inexistente, ou não publicado quando quem pede é a criança. → 404. */
export class HelpTutorialNotFoundError extends DomainError {
  readonly code = 'HELP_TUTORIAL_NOT_FOUND'
  constructor(message = 'Tutorial não encontrado') {
    super(message)
  }
}

/** Coleção inexistente. → 404. */
export class HelpCollectionNotFoundError extends DomainError {
  readonly code = 'HELP_COLLECTION_NOT_FOUND'
  constructor(message = 'Coleção não encontrada') {
    super(message)
  }
}

/** O `expectedRevision` do PATCH ficou para trás: outra aba salvou antes. → 409. */
export class HelpTutorialConflictError extends DomainError {
  readonly code = 'HELP_TUTORIAL_CONFLICT'
  constructor(
    readonly currentRevision: number,
    message = 'Este tutorial foi salvo por outra pessoa. Recarregue para continuar.',
  ) {
    super(message)
  }
}

/** O rascunho não passa nos bloqueios editoriais e não pode ser publicado. → 400. */
export class HelpTutorialInvalidError extends DomainError {
  readonly code = 'HELP_TUTORIAL_INVALID'
  constructor(
    readonly issues: HelpValidationIssue[],
    message = 'O tutorial ainda não está pronto para publicar',
  ) {
    super(message)
  }
}

/** Endereço já usado por outro tutorial ou coleção. → 409. */
export class HelpDuplicateSlugError extends DomainError {
  readonly code = 'HELP_DUPLICATE_SLUG'
  constructor(message = 'Já existe um item com esse endereço') {
    super(message)
  }
}

/** Arquivar coleção que ainda tem tutorial publicado deixaria a criança sem porta. → 409. */
export class HelpCollectionInUseError extends DomainError {
  readonly code = 'HELP_COLLECTION_IN_USE'
  constructor(message = 'Esta coleção ainda tem tutoriais publicados. Despublique-os antes.') {
    super(message)
  }
}

/** Tutorial arquivado não volta a ser editado nem publicado. → 409. */
export class HelpTutorialArchivedError extends DomainError {
  readonly code = 'HELP_TUTORIAL_ARCHIVED'
  constructor(message = 'Este tutorial está arquivado') {
    super(message)
  }
}
