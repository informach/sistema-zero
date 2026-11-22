import { type CourseLearner, courseLearnerOf } from '@sistemazero/core/course/learner'
import type { CourseAudience } from '../../domain/course/course'
import type { CourseRepository } from '../../domain/ports/course-repository.port'

export interface MemberCourseHistoryScope {
  audience?: CourseAudience
  learner?: CourseLearner
}

/** Históricos sem paginação podem filtrar pelo público atual do curso em uma leitura em lote. */
export async function memberCourseHistory<T extends { courseId: string }>(
  rows: T[],
  courses: Pick<CourseRepository, 'findCoursesByIds'>,
  scope: MemberCourseHistoryScope,
): Promise<T[]> {
  if (!scope.audience && !scope.learner) return rows
  const known = await courses.findCoursesByIds([...new Set(rows.map((row) => row.courseId))])
  const allowed = new Set(
    known
      .filter(
        (course) =>
          (!scope.audience || course.audience === scope.audience) &&
          (!scope.learner || courseLearnerOf(course.learner) === scope.learner),
      )
      .map((course) => course.id),
  )
  return rows.filter((row) => allowed.has(row.courseId))
}
