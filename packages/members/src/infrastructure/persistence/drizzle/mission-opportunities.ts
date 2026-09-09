import { sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { MissionGoalType } from '../../../domain/gamification/missions'
import type { Database } from './db'

/** Metadata only, in one query. Never load quiz answers or project JSON for the mission shelf. */
export async function contentMissionOpportunities(
  db: Database,
  userId: string,
  audience: CourseAudience,
  courseSlugs: string[],
): Promise<Map<MissionGoalType, number>> {
  const result = new Map<MissionGoalType, number>()
  for (const goal of [
    'lesson_complete',
    'unit_complete',
    'quiz_passed',
    'studio_submitted',
    'course_showcased',
    'course_rated',
  ] as const)
    result.set(goal, 0)
  if (!courseSlugs.length) return result
  const rows = await db.execute<{ goal: MissionGoalType; remaining: string }>(sql`
    with accessible as (
      select id, sequential_lock from members.courses
      where slug in (${sql.join(
        courseSlugs.map((slug) => sql`${slug}`),
        sql`, `,
      )})
        and audience = ${audience} and status in ('published', 'archived')
    ), published as (
      select l.id, l.course_id, l.module_id, l.sort_order, m.sort_order as module_order,
        c.sequential_lock, exists (
          select 1 from members.active_lesson_blocks b where b.lesson_id=l.id and b.kind='coming_soon'
        ) as coming_soon
      from members.lessons l join accessible c on c.id=l.course_id
      join members.modules m on m.id=l.module_id where l.is_published
    ), ready as (
      select p.* from published p where not p.coming_soon and (
        not p.sequential_lock or not exists (
          select 1 from published earlier where earlier.course_id=p.course_id
            and earlier.coming_soon and (earlier.module_order, earlier.sort_order) < (p.module_order, p.sort_order)
        )
      )
    ), candidates as (
      select 'lesson_complete' as goal, id as source_id from ready
      union select 'unit_complete', r.module_id from ready r where not exists (
        select 1 from published p where p.module_id=r.module_id and p.id not in (select id from ready)
      )
      union select 'quiz_passed', b.id from members.active_lesson_blocks b join ready r on r.id=b.lesson_id
        where b.kind='quiz' and jsonb_array_length(coalesce(b.content->'questions', '[]'::jsonb))>0
      union select 'studio_submitted', b.id from members.active_lesson_blocks b join ready r on r.id=b.lesson_id
        where b.kind='studio'
      union select 'course_showcased', r.course_id from members.active_lesson_blocks b join ready r on r.id=b.lesson_id
        where b.kind='studio' and b.content->'showcase'->>'enabled'='true'
      union select 'course_rated', course_id from ready
    )
    select c.goal, count(*)::text as remaining from candidates c where not exists (
      select 1 from members.xp_events e where e.user_id=${userId} and e.audience=${audience}
        and e.source_type::text=c.goal and e.source_id=c.source_id
    ) group by c.goal
  `)
  for (const row of rows) result.set(row.goal, Number(row.remaining))
  return result
}
