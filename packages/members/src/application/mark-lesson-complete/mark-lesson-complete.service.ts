import {
  LessonNotFoundError,
  QuizGateNotPassedError,
  StudioGateNotSubmittedError,
} from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { type LessonCompleteView, toCourseProgressView } from '../mappers/views'

/**
 * Marca a aula como concluída (idempotente) e devolve o progresso atualizado
 * + o delta de gamificação (XP/streak/badges — campo aditivo, `null` se o
 * award falhou). GATE: aula com bloco de quiz COM `passingScore` exige
 * tentativa aprovada (409 QUIZ_GATE_NOT_PASSED). Quiz sem `passingScore` é
 * fixação (não bloqueia). Aula JÁ concluída nunca é barrada (não regride
 * estado se o quiz mudou depois).
 */
export class MarkLessonCompleteService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly quizAttempts: QuizAttemptRepository,
    private readonly studioSubmissions: StudioSubmissionRepository,
    private readonly gamification: AwardGamificationService,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    privileged = false,
    accountId?: string,
  ): Promise<LessonCompleteView> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho não pode ser concluída pelo aluno → 404 (consistente com o GET).
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    // Acesso pela CONTA (sessão de perfil); progresso/XP pelo userId (o perfil).
    const { course } = await this.checkAccess.requireById(
      accountId ?? userId,
      lesson.courseId,
      privileged,
    )

    const completedIds = await this.progress.listCompletedLessonIds(userId, course.id)
    if (!completedIds.includes(lessonId)) {
      // Só gateiam quizzes COM nota de corte E com questões: um quiz gated vazio
      // não é respondível (a UI não o renderiza), então gatear nele travaria a
      // aula para sempre. A autoria já barra esse estado (validateQuizAuthoring),
      // mas dados legados/escrita direta podem tê-lo — defesa em profundidade.
      const gatedQuizIds = lesson.blocks
        .filter(
          (b) =>
            b.content.kind === 'quiz' &&
            b.content.passingScore !== undefined &&
            b.content.questions.length > 0,
        )
        .map((b) => b.id)
      if (gatedQuizIds.length > 0) {
        const summaries = await this.quizAttempts.summarizeByBlockIds(userId, gatedQuizIds)
        const allPassed = gatedQuizIds.every((id) => summaries.get(id)?.everPassed)
        if (!allPassed) throw new QuizGateNotPassedError()
      }

      // Mesmo gate do quiz, para o bloco Estúdio: a aula só conclui depois que o
      // aluno ENVIA o projeto (qualquer bloco studio sem entrega → 409).
      const gatedStudioIds = lesson.blocks
        .filter((b) => b.content.kind === 'studio')
        .map((b) => b.id)
      if (gatedStudioIds.length > 0) {
        const submitted = await this.studioSubmissions.listSubmittedBlockIds(userId, gatedStudioIds)
        if (!gatedStudioIds.every((id) => submitted.has(id))) {
          throw new StudioGateNotSubmittedError()
        }
      }
    }

    await this.progress.markComplete(userId, lessonId, lesson.courseId, this.clock())

    // Numerador e denominador sobre o MESMO conjunto (aulas publicadas).
    const [total, completed, last, moduleLessonIds] = await Promise.all([
      this.courses.countPublishedLessons(course.id),
      this.progress.countCompletedPublished(userId, course.id),
      this.progress.lastCompletedAt(userId, course.id),
      this.courses.listPublishedLessonIds(lesson.moduleId),
    ])

    // Baú de fim de unidade: TODAS as aulas publicadas do módulo concluídas.
    const completedSet = new Set([...completedIds, lessonId])
    const unitCompleted =
      moduleLessonIds.length > 0 && moduleLessonIds.every((id) => completedSet.has(id))
    const courseCompleted = total > 0 && completed === total

    // Award SEMPRE (não só na 1ª conclusão): o ledger idempotente dedupa e
    // auto-cura o caso "conclusão gravada mas award perdido" (fail-open).
    const gamification = await this.gamification.awardLessonCompletion({
      userId,
      lessonId,
      moduleId: lesson.moduleId,
      courseId: course.id,
      audience: course.audience,
      unitCompleted,
      courseCompleted,
      privileged,
    })

    return { ...toCourseProgressView(computeProgress(completed, total), last), gamification }
  }
}
