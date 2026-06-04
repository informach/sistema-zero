import type { QuizAnswers, QuizAttemptSummary } from '../course/quiz'

export interface QuizAttemptRecord {
  id: string
  userId: string
  lessonId: string
  blockId: string
  courseId: string
  score: number
  passed: boolean
  answers: QuizAnswers
  createdAt: Date
}

/** Histórico de tentativas de quiz (cada submit = 1 linha; estado é derivado). */
export interface QuizAttemptRepository {
  save(attempt: QuizAttemptRecord): Promise<void>
  /** Resumo por bloco (última tentativa + contagem + jáAprovou), em lote por aula. */
  summarizeByBlockIds(userId: string, blockIds: string[]): Promise<Map<string, QuizAttemptSummary>>
}
