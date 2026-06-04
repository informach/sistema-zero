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
  ) {}

  async execute(userId: string, courseSlug: string): Promise<CourseDetailView> {
    const { course, entitlement } = await this.checkAccess.requireBySlug(userId, courseSlug)
    const [outline, completedIds, total, last, lastAccessed] = await Promise.all([
      this.courses.findOutline(course.id),
      this.progress.listCompletedLessonIds(userId, course.id),
      this.courses.countLessons(course.id),
      this.progress.lastCompletedAt(userId, course.id),
      this.positions.lastAccessedLessonId(userId, course.id),
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
    )
  }
}
