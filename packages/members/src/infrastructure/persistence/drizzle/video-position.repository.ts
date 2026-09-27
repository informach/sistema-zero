import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, max } from 'drizzle-orm'
import type { RecentLessonActivity } from '../../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../../domain/ports/video-position-repository.port'
import type { Database } from './db'
import { courses, lessonBlockProgress, lessonNavigation, lessonProgress, lessons } from './schema'

export class DrizzleVideoPositionRepository implements VideoPositionRepository {
  constructor(private readonly db: Database) {}

  /** Lesson activity combines legacy playback, per-block progress and section navigation.
   * Video timestamps remain in their own storage; opening a section never overwrites them.
   */
  private accessedLessons(userIds: string[], courseIds?: string[]) {
    return this.db
      .select({
        userId: lessonProgress.userId,
        courseId: lessonProgress.courseId,
        lessonId: lessonProgress.lessonId,
        updatedAt: lessonProgress.updatedAt,
      })
      .from(lessonProgress)
      .where(
        and(
          inArray(lessonProgress.userId, userIds),
          courseIds ? inArray(lessonProgress.courseId, courseIds) : undefined,
        ),
      )
      .unionAll(
        this.db
          .select({
            userId: lessonBlockProgress.userId,
            courseId: lessons.courseId,
            lessonId: lessonBlockProgress.lessonId,
            updatedAt: lessonBlockProgress.updatedAt,
          })
          .from(lessonBlockProgress)
          .innerJoin(lessons, eq(lessons.id, lessonBlockProgress.lessonId))
          .where(
            and(
              inArray(lessonBlockProgress.userId, userIds),
              courseIds ? inArray(lessons.courseId, courseIds) : undefined,
            ),
          ),
      )
      .unionAll(
        this.db
          .select({
            userId: lessonNavigation.userId,
            courseId: lessons.courseId,
            lessonId: lessonNavigation.lessonId,
            updatedAt: lessonNavigation.updatedAt,
          })
          .from(lessonNavigation)
          .innerJoin(lessons, eq(lessons.id, lessonNavigation.lessonId))
          .where(
            and(
              inArray(lessonNavigation.userId, userIds),
              courseIds ? inArray(lessons.courseId, courseIds) : undefined,
            ),
          ),
      )
      .as('accessed_lessons')
  }

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
    const activity = this.accessedLessons([userId], [courseId])
    const [row] = await this.db
      .select({ lessonId: activity.lessonId })
      .from(activity)
      .orderBy(desc(activity.updatedAt), desc(activity.lessonId))
      .limit(1)
    return row?.lessonId ?? null
  }

  async lastAccessedByCourseIds(userId: string, courseIds: string[]): Promise<Map<string, string>> {
    if (courseIds.length === 0) return new Map()
    const activity = this.accessedLessons([userId], courseIds)
    // Aggregate blocks to one row per lesson before selecting the latest per course.
    const rows = await this.db
      .select({ courseId: activity.courseId, lessonId: activity.lessonId })
      .from(activity)
      .groupBy(activity.courseId, activity.lessonId)
      .orderBy(desc(max(activity.updatedAt)), desc(activity.lessonId))
    const out = new Map<string, string>()
    for (const r of rows) {
      if (!out.has(r.courseId)) out.set(r.courseId, r.lessonId)
    }
    return out
  }

  async lastAccessByCourse(userId: string): Promise<Map<string, Date>> {
    const activity = this.accessedLessons([userId])
    const rows = await this.db
      .select({ courseId: activity.courseId, at: max(activity.updatedAt) })
      .from(activity)
      .groupBy(activity.courseId)
    const out = new Map<string, Date>()
    for (const r of rows) {
      if (r.at) out.set(r.courseId, r.at)
    }
    return out
  }

  async lastAccessByUsers(userIds: string[]): Promise<Map<string, Map<string, Date>>> {
    if (userIds.length === 0) return new Map()
    const activity = this.accessedLessons(userIds)
    const rows = await this.db
      .select({
        userId: activity.userId,
        courseId: activity.courseId,
        at: max(activity.updatedAt),
      })
      .from(activity)
      .groupBy(activity.userId, activity.courseId)
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
    const activity = this.accessedLessons([userId])
    const rows = await this.db
      .select({
        lessonId: activity.lessonId,
        lessonTitle: lessons.title,
        courseTitle: courses.title,
        at: max(activity.updatedAt),
      })
      .from(activity)
      .leftJoin(lessons, eq(lessons.id, activity.lessonId))
      .leftJoin(courses, eq(courses.id, activity.courseId))
      .groupBy(activity.lessonId, lessons.title, courses.title)
      .orderBy(desc(max(activity.updatedAt)), desc(activity.lessonId))
      .limit(limit)
    return rows.map((r) => ({
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle ?? null,
      courseTitle: r.courseTitle ?? null,
      at: r.at!,
    }))
  }
}
