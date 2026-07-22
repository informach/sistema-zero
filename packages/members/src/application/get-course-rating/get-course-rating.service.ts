import type { CourseRatingRepository } from '../../domain/ports/course-rating-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { type CourseRatingView, toCourseRatingView } from '../mappers/views'

/** Classificação que o aluno deu ao curso — `null` se ainda não classificou. */
export class GetCourseRatingService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly ratings: CourseRatingRepository,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    privileged = false,
    accountId?: string,
  ): Promise<CourseRatingView | null> {
    // Acesso pela CONTA (sessão de perfil → x-auth-account-id); dados pelo userId.
    const { course } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
      userId,
    )
    const rating = await this.ratings.find(userId, course.id)
    return rating ? toCourseRatingView(rating) : null
  }
}
