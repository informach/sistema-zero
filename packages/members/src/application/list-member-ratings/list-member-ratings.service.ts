import type { CourseRatingRepository } from '../../domain/ports/course-rating-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import { type MemberRatingView, toMemberRatingView } from '../mappers/admin-views'
import {
  type MemberCourseHistoryScope,
  memberCourseHistory,
} from '../mappers/member-course-history'

/**
 * Classificações que um aluno deu aos cursos (ficha admin), mais recentes primeiro.
 * O `userId` é o APRENDIZ (conta no adulto, perfil no kids). Read-only.
 */
export class ListMemberRatingsService {
  constructor(
    private readonly ratings: CourseRatingRepository,
    private readonly courses: CourseRepository,
  ) {}

  async execute(
    userId: string,
    scope: MemberCourseHistoryScope = {},
  ): Promise<{ ratings: MemberRatingView[] }> {
    const rows = await this.ratings.listByUser(userId)
    return {
      ratings: (await memberCourseHistory(rows, this.courses, scope)).map(toMemberRatingView),
    }
  }
}
