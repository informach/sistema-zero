import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { QuizAttemptSummary } from '../../../domain/course/quiz'
import type {
  QuizAttemptRecord,
  QuizAttemptRepository,
  RecentQuizAttempt,
} from '../../../domain/ports/quiz-attempt-repository.port'
import type { Database } from './db'
import { courses, lessons, quizAttempts } from './schema'

export class DrizzleQuizAttemptRepository implements QuizAttemptRepository {
  constructor(private readonly db: Database) {}

  async save(attempt: QuizAttemptRecord, guard?: { cooldownMs: number }): Promise<boolean> {
    if (!guard) {
      await this.db.insert(quizAttempts).values(attempt)
      return true
    }
    // Fecha a corrida check-then-act de dois submits simultâneos: o advisory
    // xact-lock serializa por (aluno, bloco) — escopo mínimo, não trava outros
    // alunos — e o cooldown é RE-checado dentro da seção crítica. O lock solta
    // sozinho no commit/rollback.
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${attempt.userId}:${attempt.blockId}`}, 0))`,
      )
      const rows = await tx
        .select({ passed: quizAttempts.passed, createdAt: quizAttempts.createdAt })
        .from(quizAttempts)
        .where(
          and(eq(quizAttempts.userId, attempt.userId), eq(quizAttempts.blockId, attempt.blockId)),
        )
        // `id` como desempate determinístico: dois submits no MESMO ms (duplo-clique/
        // retry) não deixam `rows[0]` ambíguo (afeta lastScore/lastPassed/cooldown).
        .orderBy(desc(quizAttempts.createdAt), desc(quizAttempts.id))
      const last = rows[0]
      const everPassed = rows.some((r) => r.passed)
      const blocked =
        last !== undefined &&
        !everPassed &&
        !last.passed &&
        last.createdAt.getTime() + guard.cooldownMs > attempt.createdAt.getTime()
      if (blocked) return false
      await tx.insert(quizAttempts).values(attempt)
      return true
    })
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
      // Desempate determinístico no mesmo ms (ver save()): a linha mais recente por
      // bloco define lastScore/lastPassed/lastAttemptAt do resumo.
      .orderBy(desc(quizAttempts.createdAt), desc(quizAttempts.id))
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

  async listRecentByUser(userId: string, limit: number): Promise<RecentQuizAttempt[]> {
    const rows = await this.db
      .select({
        blockId: quizAttempts.blockId,
        lessonId: quizAttempts.lessonId,
        lessonTitle: lessons.title,
        courseTitle: courses.title,
        score: quizAttempts.score,
        passed: quizAttempts.passed,
        createdAt: quizAttempts.createdAt,
      })
      .from(quizAttempts)
      .leftJoin(lessons, eq(lessons.id, quizAttempts.lessonId))
      .leftJoin(courses, eq(courses.id, quizAttempts.courseId))
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.createdAt), desc(quizAttempts.id))
      .limit(limit)
    return rows.map((r) => ({
      ...r,
      lessonTitle: r.lessonTitle ?? null,
      courseTitle: r.courseTitle ?? null,
    }))
  }
}
