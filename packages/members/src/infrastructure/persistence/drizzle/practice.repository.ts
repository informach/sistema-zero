import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { QuizAnswers } from '../../../domain/course/quiz'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import type { PracticeRepository } from '../../../domain/ports/practice-repository.port'
import { PracticeNotFoundError, type PracticeSession } from '../../../domain/practice/practice'
import type { Database } from './db'
import { accountDeletionFences, practiceSessions } from './schema'

const owned = (id: string, userId: string, accountId: string) =>
  and(
    eq(practiceSessions.id, id),
    eq(practiceSessions.userId, userId),
    eq(practiceSessions.accountId, accountId),
  )

export class DrizzlePracticeRepository implements PracticeRepository {
  constructor(private readonly db: Database) {}
  async list(userId: string, accountId: string) {
    return this.db
      .select()
      .from(practiceSessions)
      .where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.accountId, accountId)))
      .orderBy(desc(practiceSessions.createdAt), desc(practiceSessions.id))
      .limit(20)
  }
  async get(id: string, userId: string, accountId: string) {
    const [row] = await this.db
      .select()
      .from(practiceSessions)
      .where(owned(id, userId, accountId))
    return row ?? null
  }
  async create(session: PracticeSession) {
    return this.db.transaction(async (tx) => {
      // Same per-profile write lock as account purge: no history can reappear after deletion.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${session.userId}`}, 0))`,
      )
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, session.accountId))
      if (fence) throw new AccessDeniedError('Esta conta foi excluída.')
      await tx.insert(practiceSessions).values(session).onConflictDoNothing()
      const [row] = await tx
        .select()
        .from(practiceSessions)
        .where(owned(session.id, session.userId, session.accountId))
      if (!row) throw new PracticeNotFoundError()
      return row
    })
  }
  async complete(id: string, userId: string, accountId: string, answers: QuizAnswers, now: Date) {
    // Conditional UPDATE serializes concurrent submissions; the first answer is immutable.
    await this.db
      .update(practiceSessions)
      .set({ answers, completedAt: now })
      .where(and(owned(id, userId, accountId), isNull(practiceSessions.completedAt)))
    return this.get(id, userId, accountId)
  }
}
