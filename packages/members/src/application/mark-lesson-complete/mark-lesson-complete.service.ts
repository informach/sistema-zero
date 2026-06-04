import { LessonNotFoundError, QuizGateNotPassedError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import { type CourseProgressView, toCourseProgressView } from '../mappers/views'

/**
 * Marca a aula como concluída (idempotente) e devolve o progresso atualizado.
 * GATE: aula com bloco de quiz COM `passingScore` exige tentativa aprovada
 * (409 QUIZ_GATE_NOT_PASSED). Quiz sem `passingScore` é fixação (não bloqueia).
 * Aula JÁ concluída nunca é barrada (não regride estado se o quiz mudou depois).
 */
export class MarkLessonCompleteService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly quizAttempts: QuizAttemptRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, lessonId: string): Promise<CourseProgressView> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho não pode ser concluída pelo aluno → 404 (consistente com o GET).
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const { course } = await this.checkAccess.requireById(userId, lesson.courseId)

    const completedIds = await this.progress.listCompletedLessonIds(userId, course.id)
    if (!completedIds.includes(lessonId)) {
      const gatedQuizIds = lesson.blocks
        .filter((b) => b.content.kind === 'quiz' && b.content.passingScore !== undefined)
        .map((b) => b.id)
      if (gatedQuizIds.length > 0) {
        const summaries = await this.quizAttempts.summarizeByBlockIds(userId, gatedQuizIds)
        const allPassed = gatedQuizIds.every((id) => summaries.get(id)?.everPassed)
        if (!allPassed) throw new QuizGateNotPassedError()
      }
    }

    await this.progress.markComplete(userId, lessonId, lesson.courseId, this.clock())

    const [total, completed, last] = await Promise.all([
      this.courses.countPublishedLessons(course.id),
      this.progress.countCompleted(userId, course.id),
      this.progress.lastCompletedAt(userId, course.id),
    ])
    return toCourseProgressView(computeProgress(completed, total), last)
  }
}
