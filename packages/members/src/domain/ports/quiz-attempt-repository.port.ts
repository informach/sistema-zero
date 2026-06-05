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
  /**
   * Persiste a tentativa. Com `guard`, o cooldown é RE-CHECADO atomicamente
   * (serializado por aluno+bloco) — fecha a corrida check-then-act de dois
   * submits simultâneos. `false` = bloqueado pelo cooldown (nada gravado).
   */
  save(attempt: QuizAttemptRecord, guard?: { cooldownMs: number }): Promise<boolean>
  /** Resumo por bloco (última tentativa + contagem + jáAprovou), em lote por aula. */
  summarizeByBlockIds(userId: string, blockIds: string[]): Promise<Map<string, QuizAttemptSummary>>
}
