import { LessonNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import { type CourseProgressView, toCourseProgressView } from '../mappers/views'

/** Marca a aula como concluída (idempotente) e devolve o progresso atualizado. */
export class MarkLessonCompleteService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, lessonId: string): Promise<CourseProgressView> {
    const lesson = await this.courses.findLesson(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const { course } = await this.checkAccess.requireById(userId, lesson.courseId)

    await this.progress.markComplete(userId, lessonId, lesson.courseId, this.clock())

    const [total, completed, last] = await Promise.all([
      this.courses.countLessons(course.id),
      this.progress.countCompleted(userId, course.id),
      this.progress.lastCompletedAt(userId, course.id),
    ])
    return toCourseProgressView(computeProgress(completed, total), last)
  }
}
