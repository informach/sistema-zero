import {
  CertificateGateNotIssuedError,
  LessonNotFoundError,
  QuizGateNotPassedError,
  StudioGateNotPassedError,
  StudioGateNotSubmittedError,
} from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { assertLessonUnlockedFromState } from '../lesson-locking/lesson-locking'
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
      const outline = await this.courses.findOutline(course.id, { publishedOnly: true })
      assertLessonUnlockedFromState(
        course,
        lessonId,
        {
          completedLessonIds: completedIds,
          orderedPublishedLessonIds: outline.flatMap((m) => m.lessons.map((l) => l.id)),
        },
        privileged,
      )

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

      // Gate do bloco Estúdio: sem atividade (ou atividade sem nota de corte) =
      // exige ENVIO (igual à fase 1). Atividade COM `passingScore` = exige
      // APROVAÇÃO (passed_at sticky), espelhando o gate do quiz.
      const studioBlocks = lesson.blocks.filter((b) => b.content.kind === 'studio')
      if (studioBlocks.length > 0) {
        const states = await this.studioSubmissions.summarizeByBlockIds(
          userId,
          studioBlocks.map((b) => b.id),
        )
        for (const b of studioBlocks) {
          const state = states.get(b.id)
          if (!state) throw new StudioGateNotSubmittedError()
          const gated =
            b.content.kind === 'studio' && b.content.activity?.passingScore !== undefined
          if (gated && !state.passed) throw new StudioGateNotPassedError()
        }
      }

      if (lesson.blocks.some((b) => b.content.kind === 'certificate')) {
        throw new CertificateGateNotIssuedError()
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
      accountId: accountId ?? userId,
      lessonId,
      moduleId: lesson.moduleId,
      courseId: course.id,
      audience: course.audience,
      unitCompleted,
      courseCompleted,
      privileged,
    })

    // Vitrine (Mural): a aula tem um bloco de estúdio marcado p/ publicação? Então o
    // front mostra o botão "Publicar no Mural" (o BFF re-busca o conteúdo autoritativo).
    const showcaseBlock = lesson.blocks.find(
      (b) => b.content.kind === 'studio' && b.content.showcase?.enabled === true,
    )
    const showcase =
      showcaseBlock && showcaseBlock.content.kind === 'studio'
        ? {
            blockId: showcaseBlock.id,
            title: showcaseBlock.content.showcase?.title?.trim() || lesson.title,
          }
        : null

    return {
      ...toCourseProgressView(computeProgress(completed, total), last),
      gamification,
      showcase,
    }
  }
}
