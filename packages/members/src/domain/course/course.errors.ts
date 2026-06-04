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

/** Anexo inexistente na aula (rota de download do aluno). → 404. */
export class AttachmentNotFoundError extends DomainError {
  readonly code = 'ATTACHMENT_NOT_FOUND'
  constructor(message = 'Material não encontrado') {
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
}

/** Publicar curso sem nenhuma aula publicada. → 409. */
export class NoPublishedLessonError extends DomainError {
  readonly code = 'NO_PUBLISHED_LESSON'
  constructor(message = 'Publique ao menos uma aula antes de publicar o curso') {
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

/** Bloco de quiz inexistente (ou o bloco não é um quiz). → 404. */
export class QuizBlockNotFoundError extends DomainError {
  readonly code = 'QUIZ_BLOCK_NOT_FOUND'
  constructor(message = 'Quiz não encontrado') {
    super(message)
  }
}

/** Retry do quiz dentro do cooldown após reprovar. → 429. */
export class QuizCooldownError extends DomainError {
  readonly code = 'QUIZ_COOLDOWN'
  constructor(readonly retryAvailableAt: Date) {
    super(`Aguarde para refazer o quiz (disponível em ${retryAvailableAt.toISOString()})`)
  }
}

/** Aula tem quiz com nota de corte ainda não aprovado — conclusão bloqueada. → 409. */
export class QuizGateNotPassedError extends DomainError {
  readonly code = 'QUIZ_GATE_NOT_PASSED'
  constructor(message = 'Conclua o quiz da aula com a nota mínima para finalizá-la') {
    super(message)
  }
}
