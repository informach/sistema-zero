import { and, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { CourseAudience } from '../../../domain/course/course'
import type { Database } from './db'
import { courses, xpEvents } from './schema'

/**
 * Same eligibility during earning and later reads, including bonus courses and legacy metadata.
 * The completion event must match its modality. Live rewards do not require Mural.
 */
export function studioGrantCompletionMatchesCourse() {
  return or(
    and(eq(courses.modality, 'recorded'), eq(xpEvents.sourceType, 'course_complete')),
    and(eq(courses.modality, 'live'), eq(xpEvents.sourceType, 'live_course_complete')),
  )
}

export async function eligibleStudioGrants(
  db: Pick<Database, 'select'>,
  userId: string,
  audience: CourseAudience,
  courseIds?: string[],
): Promise<{ courseId: string; blocks: string[] }[]> {
  if (courseIds?.length === 0) return []
  const showcased = alias(xpEvents, 'studio_grant_showcased')
  const rows = await db
    .select({ courseId: courses.id, metadata: courses.metadata })
    .from(xpEvents)
    .innerJoin(
      courses,
      and(
        eq(courses.id, xpEvents.sourceId),
        eq(courses.audience, audience),
        eq(courses.status, 'published'),
        studioGrantCompletionMatchesCourse(),
      ),
    )
    .leftJoin(
      showcased,
      and(
        eq(showcased.userId, xpEvents.userId),
        eq(showcased.audience, xpEvents.audience),
        eq(showcased.sourceType, 'course_showcased'),
        eq(showcased.sourceId, xpEvents.sourceId),
      ),
    )
    .where(
      and(
        eq(xpEvents.userId, userId),
        eq(xpEvents.audience, audience),
        audience === 'kids'
          ? or(eq(courses.modality, 'live'), isNull(courses.careerSlot), isNotNull(showcased.id))
          : undefined,
        courseIds ? inArray(courses.id, courseIds) : undefined,
      ),
    )
  return rows.flatMap((row) => {
    const raw = row.metadata?.studioUnlockBlocks
    if (!Array.isArray(raw)) return []
    const blocks = [
      ...new Set(
        raw.filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    ]
    return blocks.length ? [{ courseId: row.courseId, blocks }] : []
  })
}
