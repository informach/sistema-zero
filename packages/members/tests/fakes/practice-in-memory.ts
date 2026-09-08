import type { QuizAnswers } from '../../src/domain/course/quiz'
import type { PracticeRepository } from '../../src/domain/ports/practice-repository.port'
import { PracticeNotFoundError, type PracticeSession } from '../../src/domain/practice/practice'

export class InMemoryPracticeRepository implements PracticeRepository {
  readonly sessions = new Map<string, PracticeSession>()
  async list(userId: string, accountId: string) {
    return [...this.sessions.values()]
      .filter((row) => row.userId === userId && row.accountId === accountId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
      .slice(0, 20)
  }
  async get(id: string, userId: string, accountId: string) {
    const row = this.sessions.get(id)
    return row?.userId === userId && row.accountId === accountId ? structuredClone(row) : null
  }
  async create(session: PracticeSession) {
    const existing = this.sessions.get(session.id)
    if (
      existing &&
      (existing.userId !== session.userId || existing.accountId !== session.accountId)
    )
      throw new PracticeNotFoundError()
    if (!existing) this.sessions.set(session.id, structuredClone(session))
    return structuredClone(existing ?? session)
  }
  async complete(id: string, userId: string, accountId: string, answers: QuizAnswers, now: Date) {
    const row = this.sessions.get(id)
    if (!row || row.userId !== userId || row.accountId !== accountId) return null
    if (!row.completedAt) {
      row.answers = structuredClone(answers)
      row.completedAt = now
    }
    return structuredClone(row)
  }
}
