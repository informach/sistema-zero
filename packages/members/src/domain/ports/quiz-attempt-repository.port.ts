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

/** Uma tentativa de quiz recente (ficha admin), com a aula/curso resolvidos. */
export interface RecentQuizAttempt {
  blockId: string
  lessonId: string
  lessonTitle: string | null
  courseTitle: string | null
  score: number
  passed: boolean
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
  /**
   * Tentativas mais recentes do aluno (ficha admin — linha do tempo), com aula/curso
   * resolvidos por join. Limitado a `limit` (mais recentes primeiro).
   */
  listRecentByUser(userId: string, limit: number): Promise<RecentQuizAttempt[]>
}
