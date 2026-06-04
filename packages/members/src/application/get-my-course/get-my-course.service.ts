import type { CourseRatingRepository } from '../../domain/ports/course-rating-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import { computeProgress, resolveContinueLesson } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
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

  async execute(userId: string, courseSlug: string): Promise<CourseDetailView> {
    const { course, entitlement } = await this.checkAccess.requireBySlug(userId, courseSlug)
    // Aluno só vê aulas PUBLICADAS — outline e denominador do progresso idem.
    const [outline, completedIds, total, last, lastAccessed, myRating] = await Promise.all([
      this.courses.findOutline(course.id, { publishedOnly: true }),
      this.progress.listCompletedLessonIds(userId, course.id),
      this.courses.countPublishedLessons(course.id),
      this.progress.lastCompletedAt(userId, course.id),
      this.positions.lastAccessedLessonId(userId, course.id),
      this.ratings.find(userId, course.id),
    ])
    const completedSet = new Set(completedIds)
    const progressView = toCourseProgressView(computeProgress(completedIds.length, total), last)
    const continueLessonId = resolveContinueLesson(outline, completedSet, lastAccessed)
    return toCourseDetailView(
      course,
      outline,
      completedSet,
      entitlement,
      progressView,
      continueLessonId,
      myRating,
    )
  }
}
