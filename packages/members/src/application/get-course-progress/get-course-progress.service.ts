import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import { type CourseProgressView, toCourseProgressView } from '../mappers/views'

/** Progresso do curso para o aluno — exige acesso ativo. */
export class GetCourseProgressService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async execute(userId: string, courseSlug: string): Promise<CourseProgressView> {
    const { course } = await this.checkAccess.requireBySlug(userId, courseSlug)
    const [total, completed, last] = await Promise.all([
      this.courses.countLessons(course.id),
      this.progress.countCompleted(userId, course.id),
      this.progress.lastCompletedAt(userId, course.id),
    ])
    return toCourseProgressView(computeProgress(completed, total), last)
  }
}
