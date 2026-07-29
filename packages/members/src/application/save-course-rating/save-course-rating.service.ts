import type {
  CourseRatingRepository,
  CourseRatingUpsert,
} from '../../domain/ports/course-rating-repository.port'
import { isValidRatingHalf } from '../../domain/rating/course-rating'
import { ValidationError } from '../../domain/shared/errors'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { type CourseRatingView, toCourseRatingView } from '../mappers/views'

/**
 * Salva/atualiza a classificação do curso (upsert; 1 por aluno+curso). Cada passo
 * do fluxo da UI chama com o estado ACUMULADO (overwrite puro — ver port).
 */
export class SaveCourseRatingService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly ratings: CourseRatingRepository,
    private readonly gamification: AwardGamificationService,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    fields: CourseRatingUpsert,
    privileged = false,
    accountId?: string,
  ): Promise<CourseRatingView> {
    const { course } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
      userId,
    )
    // Defesa em profundidade — o DTO TypeBox já restringe aos 9 valores válidos.
    if (!isValidRatingHalf(fields.ratingHalf)) {
      throw new ValidationError('Nota inválida: use 1 a 5 em passos de 0.5')
    }
    const rating = await this.ratings.upsert(userId, course.id, fields, this.clock())
    // Marco de missão "classificar um curso" (amount 0, idempotente por curso —
    // reclassificar/reabrir o modal NÃO refarma). Fail-open (não derruba o rating).
    await this.gamification.awardCourseRated({
      userId,
      accountId: accountId ?? userId,
      courseId: course.id,
      audience: course.audience,
      privileged,
    })
    return toCourseRatingView(rating)
  }
}
