import { type SQLWrapper, sql } from 'drizzle-orm'

/** A coming-soon block hides every activity in its lesson, including a showcase. */
export function lessonContentAvailable(lessonId: SQLWrapper) {
  return sql`not exists (
    select 1 from members.active_lesson_blocks pending
    where pending.lesson_id = ${lessonId} and pending.kind = 'coming_soon'
  )`
}
