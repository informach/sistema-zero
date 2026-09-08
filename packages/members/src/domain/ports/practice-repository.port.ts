import type { QuizAnswers } from '../course/quiz'
import type { PracticeSession } from '../practice/practice'

export interface PracticeRepository {
  list(userId: string, accountId: string): Promise<PracticeSession[]>
  get(id: string, userId: string, accountId: string): Promise<PracticeSession | null>
  /** Idempotent by client-generated id, only for the same owner. */
  create(session: PracticeSession): Promise<PracticeSession>
  /** First submission wins; retry returns the saved answers, never awards anything. */
  complete(
    id: string,
    userId: string,
    accountId: string,
    answers: QuizAnswers,
    now: Date,
  ): Promise<PracticeSession | null>
}
