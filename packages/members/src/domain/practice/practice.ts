import type { QuizBlock } from '../course/lesson-block'
import type { QuizAnswers } from '../course/quiz'
import { DomainError } from '../shared/errors'

/** Separate from course attempts and the rewards ledger. The studied revision is frozen. */
export interface PracticeSession {
  id: string
  userId: string
  accountId: string
  courseId: string
  courseSlug: string
  lessonId: string
  blockId: string
  title: string
  quiz: QuizBlock
  answers: QuizAnswers | null
  createdAt: Date
  completedAt: Date | null
}

export class PracticeNotFoundError extends DomainError {
  readonly code = 'PRACTICE_NOT_FOUND'
  constructor() {
    super('Prática não encontrada')
  }
}
export class PracticeNotReadyError extends DomainError {
  readonly code = 'PRACTICE_NOT_READY'
  constructor() {
    super('Conclua esta aula e seu quiz antes de praticar por aqui.')
  }
}
