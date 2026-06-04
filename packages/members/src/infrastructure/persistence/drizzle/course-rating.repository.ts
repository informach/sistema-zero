import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type {
  CourseRatingRepository,
  CourseRatingUpsert,
} from '../../../domain/ports/course-rating-repository.port'
import type { CourseRating } from '../../../domain/rating/course-rating'
import type { Database } from './db'
import { courseRatings } from './schema'

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
}
