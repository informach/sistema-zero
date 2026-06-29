import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import type {
  CourseRatingRepository,
  CourseRatingUpsert,
  MemberCourseRating,
} from '../../../domain/ports/course-rating-repository.port'
import type { CourseRating } from '../../../domain/rating/course-rating'
import type { Database } from './db'
import { courseRatings, courses } from './schema'

export class DrizzleCourseRatingRepository implements CourseRatingRepository {
  constructor(private readonly db: Database) {}

  async find(userId: string, courseId: string): Promise<CourseRating | null> {
    const [row] = await this.db
      .select()
      .from(courseRatings)
      .where(and(eq(courseRatings.userId, userId), eq(courseRatings.courseId, courseId)))
      .limit(1)
    return row ?? null
  }

  async upsert(
    userId: string,
    courseId: string,
    fields: CourseRatingUpsert,
    now: Date,
  ): Promise<CourseRating> {
    // Overwrite puro (ver port): `createdAt` fica FORA do `set` (preserva o 1º registro).
    const [row] = await this.db
      .insert(courseRatings)
      .values({ id: randomUUID(), userId, courseId, ...fields, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [courseRatings.userId, courseRatings.courseId],
        set: { ...fields, updatedAt: now },
      })
      .returning()
    if (!row) throw new Error('course_ratings upsert não retornou a linha')
    return row
  }

  async listByUser(userId: string): Promise<MemberCourseRating[]> {
    // LEFT join em `courses`: a classificação sobrevive ao curso apagado (FK é
    // ON DELETE CASCADE, mas defensivo) → título/ref `null`. Mais recentes primeiro.
    const rows = await this.db
      .select({
        id: courseRatings.id,
        userId: courseRatings.userId,
        courseId: courseRatings.courseId,
        ratingHalf: courseRatings.ratingHalf,
        comment: courseRatings.comment,
        feedbackAnswers: courseRatings.feedbackAnswers,
        createdAt: courseRatings.createdAt,
        updatedAt: courseRatings.updatedAt,
        courseTitle: courses.title,
        courseRef: courses.slug,
      })
      .from(courseRatings)
      .leftJoin(courses, eq(courses.id, courseRatings.courseId))
      .where(eq(courseRatings.userId, userId))
      .orderBy(desc(courseRatings.updatedAt))
    return rows.map((r) => ({
      ...r,
      feedbackAnswers: r.feedbackAnswers ?? null,
      courseTitle: r.courseTitle ?? null,
      courseRef: r.courseRef ?? null,
    }))
  }
}
