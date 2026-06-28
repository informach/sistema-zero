import { LessonNotFoundError } from '../../domain/course/course.errors'
import { computeRetryAvailableAt } from '../../domain/course/quiz'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlockedFromState } from '../lesson-locking/lesson-locking'
import {
  type LessonDetailView,
  type QuizStateView,
  type StudioStateView,
  toLessonDetailView,
} from '../mappers/views'

/** Detalhe da aula com o conteúdo COMPLETO (blocos + anexos) — exige acesso ativo. */
export class GetLessonService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
    private readonly quizAttempts: QuizAttemptRepository,
    private readonly studioSubmissions: StudioSubmissionRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    lessonId: string,
    privileged = false,
    accountId?: string,
  ): Promise<LessonDetailView> {
    const { course } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
    )
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson || lesson.courseId !== course.id || !lesson.isPublished) {
      throw new LessonNotFoundError()
    }

    const quizBlockIds = lesson.blocks.filter((b) => b.content.kind === 'quiz').map((b) => b.id)
    const studioBlockIds = lesson.blocks.filter((b) => b.content.kind === 'studio').map((b) => b.id)
    // O outline só alimenta o gate da trava sequencial; equipe (privileged) e curso
    // com a trava desligada ignoram o estado (early-return em assertLessonUnlockedFromState).
    // Carregar a árvore do curso à toa no caminho MAIS quente (toda abertura de aula)
    // é desperdício — espelha o curto-circuito de assertLessonUnlocked.
    const needsLock = course.sequentialLock && !privileged
    const [completedIds, positionSeconds, summaries, studioSummaries, outline] = await Promise.all([
      this.progress.listCompletedLessonIds(userId, course.id),
      this.positions.findPosition(userId, lessonId),
      this.quizAttempts.summarizeByBlockIds(userId, quizBlockIds),
      this.studioSubmissions.summarizeByBlockIds(userId, studioBlockIds),
      needsLock
        ? this.courses.findOutline(course.id, { publishedOnly: true })
        : Promise.resolve<Awaited<ReturnType<CourseRepository['findOutline']>>>([]),
    ])

    // Trava sequencial (estilo Duolingo): a aula só abre quando todas as aulas
    // publicadas anteriores estão concluídas. Equipe interna (privileged) ignora a
    // trava; curso com a trava desligada também. Gate em profundidade — a UI já
    // esconde os links, mas isto barra URL direta / mini-trilha lateral.
    assertLessonUnlockedFromState(
      course,
      lessonId,
      {
        completedLessonIds: completedIds,
        orderedPublishedLessonIds: outline.flatMap((m) => m.lessons.map((l) => l.id)),
      },
      privileged,
    )

    const now = this.clock()
    const quizStates = new Map<string, QuizStateView>()
    for (const [blockId, s] of summaries) {
      quizStates.set(blockId, {
        lastScore: s.lastScore,
        passed: s.everPassed,
        attemptsCount: s.attemptsCount,
        retryAvailableAt: computeRetryAvailableAt(s, now)?.toISOString() ?? null,
      })
    }

    // Estado da entrega por bloco de estúdio (submitted? + nota/aprovado quando há
    // atividade) — sem o projeto, que é pesado; o continuar usa o rascunho local.
    const studioStates = new Map<string, StudioStateView>()
    for (const blockId of studioBlockIds) {
      const state = studioSummaries.get(blockId)
      studioStates.set(blockId, {
        submitted: state != null,
        // Data exata não é necessária ao gate/UI do aluno; o painel do professor a traz.
        submittedAt: null,
        lastScore: state?.score ?? null,
        passed: state?.passed ?? false,
      })
    }

    return toLessonDetailView(
      lesson,
      course.slug,
      completedIds.includes(lessonId),
      positionSeconds,
      quizStates,
      studioStates,
    )
  }
}
