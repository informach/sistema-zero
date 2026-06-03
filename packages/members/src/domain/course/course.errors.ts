import { DomainError } from '../shared/errors'

export class CourseNotFoundError extends DomainError {
  readonly code = 'COURSE_NOT_FOUND'
  constructor(message = 'Curso não encontrado') {
    super(message)
  }
}

export class LessonNotFoundError extends DomainError {
  readonly code = 'LESSON_NOT_FOUND'
  constructor(message = 'Aula não encontrada') {
    super(message)
  }
}

/** Módulo/bloco/anexo não encontrado (autoria). → 404. */
export class ContentNotFoundError extends DomainError {
  readonly code = 'CONTENT_NOT_FOUND'
  constructor(message = 'Conteúdo não encontrado') {
    super(message)
  }
}

/** Slug em uso (curso global, ou aula dentro do curso). → 409. */
export class DuplicateSlugError extends DomainError {
  readonly code = 'DUPLICATE_SLUG'
  constructor(message = 'Slug já está em uso') {
    super(message)
  }
}

/** Comando de autoria inválido (ex.: reordenar com ids que não batem). → 400. */
export class InvalidContentCommandError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  constructor(message: string) {
    super(message)
  }
}

/** Edição de curso perdeu a corrida (version mudou no banco). → 409. */
export class CourseConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor(message = 'Curso alterado por outra operação') {
    super(message)
  }
}
