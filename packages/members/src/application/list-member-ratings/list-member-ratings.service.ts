import type { CourseRatingRepository } from '../../domain/ports/course-rating-repository.port'
import { type MemberRatingView, toMemberRatingView } from '../mappers/admin-views'

/**
 * Classificações que um aluno deu aos cursos (ficha admin), mais recentes primeiro.
 * O `userId` é o APRENDIZ (conta no adulto, perfil no kids). Read-only.
 */
export class ListMemberRatingsService {
  constructor(private readonly ratings: CourseRatingRepository) {}

  async execute(userId: string): Promise<{ ratings: MemberRatingView[] }> {
    const rows = await this.ratings.listByUser(userId)
    return { ratings: rows.map(toMemberRatingView) }
  }
}
