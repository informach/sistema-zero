import type { CourseRatingRepository } from '../../domain/ports/course-rating-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import { computeProgress, resolveContinueLesson } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import { lockedLessonSetForCourse } from '../lesson-locking/lesson-locking'
import { type CourseDetailView, toCourseDetailView, toCourseProgressView } from '../mappers/views'

/** Detalhe do curso (módulos + aulas resumidas + flags de conclusão) — exige acesso. */
export class GetMyCourseService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
    private readonly ratings: CourseRatingRepository,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    privileged = false,
    accountId?: string,
  ): Promise<CourseDetailView> {
    // Acesso pela CONTA (sessão de perfil → x-auth-account-id); progresso pelo userId.
    const { course, entitlement } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
      userId,
    )
    // Aluno só vê aulas PUBLICADAS — outline e progresso idem.
    const [outline, completedIds, last, lastAccessed, myRating] = await Promise.all([
      this.courses.findOutline(course.id, { publishedOnly: true }),
      this.progress.listCompletedLessonIds(userId, course.id),
      this.progress.lastCompletedAt(userId, course.id),
      this.positions.lastAccessedLessonId(userId, course.id),
      this.ratings.find(userId, course.id),
    ])
    const completedSet = new Set(completedIds)
    // Numerador e denominador derivados do MESMO outline publicado: conclusões de
    // aulas hoje despublicadas não contam (e não infla o percentual).
    const publishedLessonIds = outline.flatMap((m) => m.lessons.map((l) => l.id))
    const completedPublished = publishedLessonIds.filter((id) => completedSet.has(id)).length
    const progressView = toCourseProgressView(
      computeProgress(completedPublished, publishedLessonIds.length),
      last,
    )
    // Trava sequencial: só calcula quando o curso a tem ligada E o ator não é equipe
    // interna (privileged navega tudo destravado, como a chave-mestra virtual).
    const lockedSet = lockedLessonSetForCourse(course, publishedLessonIds, completedSet, privileged)
    const continueLessonId = resolveContinueLesson(outline, completedSet, lastAccessed, lockedSet)
    return toCourseDetailView(
      course,
      outline,
      completedSet,
      entitlement,
      progressView,
      continueLessonId,
      myRating,
      lockedSet,
    )
  }
}
