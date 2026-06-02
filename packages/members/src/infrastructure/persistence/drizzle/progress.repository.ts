import { randomUUID } from 'node:crypto'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import type { ProgressRepository } from '../../../domain/ports/progress-repository.port'
import type { Database } from './db'
import { lessonCompletions } from './schema'

export class DrizzleProgressRepository implements ProgressRepository {
  constructor(private readonly db: Database) {}

  async markComplete(userId: string, lessonId: string, courseId: string, now: Date): Promise<void> {
    await this.db
      .insert(lessonCompletions)
      .values({ id: randomUUID(), userId, lessonId, courseId, completedAt: now })
      .onConflictDoNothing({ target: [lessonCompletions.userId, lessonCompletions.lessonId] })
  }

  async countCompleted(userId: string, courseId: string): Promise<number> {
    const [row] = await this.db
      .select({ c: count() })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, userId), eq(lessonCompletions.courseId, courseId)))
    return row?.c ?? 0
  }

  async countCompletedByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map()
    const rows = await this.db
      .select({ courseId: lessonCompletions.courseId, c: count() })
      .from(lessonCompletions)
      .where(
        and(eq(lessonCompletions.userId, userId), inArray(lessonCompletions.courseId, courseIds)),
      )
      .groupBy(lessonCompletions.courseId)
    return new Map(rows.map((r) => [r.courseId, r.c]))
  }

  async listCompletedLessonIds(userId: string, courseId: string): Promise<string[]> {
    const rows = await this.db
      .select({ lessonId: lessonCompletions.lessonId })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, userId), eq(lessonCompletions.courseId, courseId)))
    return rows.map((r) => r.lessonId)
  }

  async lastCompletedAt(userId: string, courseId: string): Promise<Date | null> {
    const [row] = await this.db
      .select({ at: lessonCompletions.completedAt })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, userId), eq(lessonCompletions.courseId, courseId)))
      .orderBy(desc(lessonCompletions.completedAt))
      .limit(1)
    return row?.at ?? null
  }
}
