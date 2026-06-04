import { LessonNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { type LessonDetailView, toLessonDetailView } from '../mappers/views'

/** Detalhe da aula com o conteúdo COMPLETO (blocos + anexos) — exige acesso ativo. */
export class GetLessonService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
  ) {}

  async execute(userId: string, courseSlug: string, lessonId: string): Promise<LessonDetailView> {
    const { course } = await this.checkAccess.requireBySlug(userId, courseSlug)
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson || lesson.courseId !== course.id) throw new LessonNotFoundError()
    const [completedIds, positionSeconds] = await Promise.all([
      this.progress.listCompletedLessonIds(userId, course.id),
      this.positions.findPosition(userId, lessonId),
    ])
    return toLessonDetailView(lesson, course.slug, completedIds.includes(lessonId), positionSeconds)
  }
}
