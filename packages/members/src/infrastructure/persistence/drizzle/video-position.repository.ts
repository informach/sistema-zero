import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, max } from 'drizzle-orm'
import type { RecentLessonActivity } from '../../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../../domain/ports/video-position-repository.port'
import type { Database } from './db'
import { courses, lessonProgress, lessons } from './schema'

export class DrizzleVideoPositionRepository implements VideoPositionRepository {
  constructor(private readonly db: Database) {}

  async upsert(
    userId: string,
    lessonId: string,
    courseId: string,
    positionSeconds: number,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(lessonProgress)
      .values({ id: randomUUID(), userId, lessonId, courseId, positionSeconds, updatedAt: now })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: { positionSeconds, updatedAt: now },
      })
  }

  async findPosition(userId: string, lessonId: string): Promise<number | null> {
    const [row] = await this.db
      .select({ positionSeconds: lessonProgress.positionSeconds })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
      .limit(1)
    return row?.positionSeconds ?? null
  }

  async lastAccessedLessonId(userId: string, courseId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)))
      .orderBy(desc(lessonProgress.updatedAt))
      .limit(1)
    return row?.lessonId ?? null
  }

  async lastAccessedByCourseIds(userId: string, courseIds: string[]): Promise<Map<string, string>> {
    if (courseIds.length === 0) return new Map()
    // Linhas do aluno são poucas (1 por aula tocada); reduz em memória, mantendo
    // a primeira (mais recente) por curso — equivale a DISTINCT ON.
    const rows = await this.db
      .select({ courseId: lessonProgress.courseId, lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.courseId, courseIds)))
      .orderBy(desc(lessonProgress.updatedAt))
    const out = new Map<string, string>()
    for (const r of rows) {
      if (!out.has(r.courseId)) out.set(r.courseId, r.lessonId)
    }
    return out
  }

  async lastAccessByCourse(userId: string): Promise<Map<string, Date>> {
    const rows = await this.db
      .select({ courseId: lessonProgress.courseId, at: max(lessonProgress.updatedAt) })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId))
      .groupBy(lessonProgress.courseId)
    const out = new Map<string, Date>()
    for (const r of rows) {
      if (r.at) out.set(r.courseId, r.at)
    }
    return out
  }

  async lastAccessByUsers(userIds: string[]): Promise<Map<string, Map<string, Date>>> {
    if (userIds.length === 0) return new Map()
    const rows = await this.db
      .select({
        userId: lessonProgress.userId,
        courseId: lessonProgress.courseId,
        at: max(lessonProgress.updatedAt),
      })
      .from(lessonProgress)
      .where(inArray(lessonProgress.userId, userIds))
      .groupBy(lessonProgress.userId, lessonProgress.courseId)
    const out = new Map<string, Map<string, Date>>()
    for (const row of rows) {
      if (!row.at) continue
      const byCourse = out.get(row.userId) ?? new Map<string, Date>()
      byCourse.set(row.courseId, row.at)
      out.set(row.userId, byCourse)
    }
    return out
  }

  async listRecentAccessed(userId: string, limit: number): Promise<RecentLessonActivity[]> {
    const rows = await this.db
      .select({
        lessonId: lessonProgress.lessonId,
        lessonTitle: lessons.title,
        courseTitle: courses.title,
        at: lessonProgress.updatedAt,
      })
      .from(lessonProgress)
      .leftJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .leftJoin(courses, eq(courses.id, lessonProgress.courseId))
      .where(eq(lessonProgress.userId, userId))
      .orderBy(desc(lessonProgress.updatedAt))
      .limit(limit)
    return rows.map((r) => ({
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle ?? null,
      courseTitle: r.courseTitle ?? null,
      at: r.at,
    }))
  }
}
