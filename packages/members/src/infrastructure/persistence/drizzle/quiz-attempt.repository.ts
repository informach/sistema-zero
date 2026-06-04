import { and, desc, eq, inArray } from 'drizzle-orm'
import type { QuizAttemptSummary } from '../../../domain/course/quiz'
import type {
  QuizAttemptRecord,
  QuizAttemptRepository,
} from '../../../domain/ports/quiz-attempt-repository.port'
import type { Database } from './db'
import { quizAttempts } from './schema'

export class DrizzleQuizAttemptRepository implements QuizAttemptRepository {
  constructor(private readonly db: Database) {}

  async save(attempt: QuizAttemptRecord): Promise<void> {
    await this.db.insert(quizAttempts).values(attempt)
  }

  async summarizeByBlockIds(
    userId: string,
    blockIds: string[],
  ): Promise<Map<string, QuizAttemptSummary>> {
    if (blockIds.length === 0) return new Map()
    // Tentativas de um aluno por quiz são poucas; agrega em memória (a linha mais
    // recente por bloco vem primeiro graças ao ORDER BY).
    const rows = await this.db
      .select({
        blockId: quizAttempts.blockId,
        score: quizAttempts.score,
        passed: quizAttempts.passed,
        createdAt: quizAttempts.createdAt,
      })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), inArray(quizAttempts.blockId, blockIds)))
      .orderBy(desc(quizAttempts.createdAt))
    const out = new Map<string, QuizAttemptSummary>()
    for (const r of rows) {
      const existing = out.get(r.blockId)
      if (!existing) {
        out.set(r.blockId, {
          attemptsCount: 1,
          lastScore: r.score,
          lastPassed: r.passed,
          lastAttemptAt: r.createdAt,
          everPassed: r.passed,
        })
        continue
      }
      existing.attemptsCount += 1
      existing.everPassed = existing.everPassed || r.passed
    }
    return out
  }
}
