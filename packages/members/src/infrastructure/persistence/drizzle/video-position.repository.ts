import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { VideoPositionRepository } from '../../../domain/ports/video-position-repository.port'
import type { Database } from './db'
import { lessonProgress } from './schema'

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
}
