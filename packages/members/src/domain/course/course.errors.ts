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
