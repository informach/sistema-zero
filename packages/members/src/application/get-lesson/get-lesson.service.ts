import { lessonCompletionRequirements } from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import { computeRetryAvailableAt } from '../../domain/course/quiz'
import { LearningConflictError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { LearningService } from '../learning/learning.service'
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
    private readonly learning: LearningService,
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
      userId,
    )
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson || lesson.courseId !== course.id || !lesson.isPublished) {
      throw new LessonNotFoundError()
    }

    const quizBlockIds = lesson.blocks.filter((b) => b.content.kind === 'quiz').map((b) => b.id)
    // Estúdio e Pinta entregam na MESMA tabela, então uma consulta só cobre os dois; o mapper
    // separa em `studioState`/`pintaState` pelo kind do bloco.
    const studioBlockIds = lesson.blocks
      .filter((b) => b.content.kind === 'studio' || b.content.kind === 'pinta')
      .map((b) => b.id)
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
        // O carimbo do professor vale para a entrega ATUAL: um reenvio depois
        // dele apaga o selo (a versão nova ainda não foi conferida).
        reviewed: state?.reviewedAt != null && state.reviewedAt >= state.submittedAt,
      })
    }

    const view = toLessonDetailView(
      lesson,
      course.slug,
      completedIds.includes(lessonId),
      positionSeconds,
      quizStates,
      studioStates,
      // Aula "em breve" esconde o resto do conteúdo do ALUNO; a equipe vê tudo
      // (é assim que a autoria confere a aula pelo "Ver como aluno").
      privileged,
    )
    if (hasComingSoonBlock(lesson.blocks) && !privileged)
      return { ...view, requirements: lessonCompletionRequirements(view) }
    const structure = await this.learning.read({ userId, accountId: accountId ?? userId }, lesson)
    for (const block of view.blocks) {
      if (
        block.quizState &&
        !structure.legacyLayout &&
        structure.sections.some((section) => section.completion?.blockIds.includes(block.id))
      )
        block.quizState.retryAvailableAt = null
    }
    const owner = { userId, accountId: accountId ?? userId }
    const sectionProgress = privileged
      ? undefined
      : await this.learning.sections.read(owner, lesson)
    if (sectionProgress && structure.revision !== sectionProgress.revision)
      throw new LearningConflictError()
    const accessible =
      sectionProgress && !privileged
        ? await this.learning.sections.accessibleBlockIds(lesson, sectionProgress)
        : null
    const sectionState = (id: string) => sectionProgress?.sections.find((s) => s.id === id)
    const savedSection = structure.progress.sectionId
    const sectionId =
      sectionProgress && (!savedSection || sectionState(savedSection)?.status === 'locked')
        ? (sectionProgress.sections.find((s) => s.status === 'available')?.id ??
          sectionProgress.sections[0]?.id ??
          null)
        : savedSection
    return {
      ...view,
      ...(sectionProgress ? { sectionProgress } : {}),
      blocks: accessible ? view.blocks.filter((b) => accessible.has(b.id)) : view.blocks,
      sections: structure.sections.map(
        ({ id, title, blockIds, workspaceBlockId, externalTool, completion }) => ({
          id,
          title,
          blockIds: !privileged && sectionState(id)?.status === 'locked' ? [] : blockIds,
          workspaceBlockId:
            !privileged && sectionState(id)?.status === 'locked' ? null : workspaceBlockId,
          externalTool: !privileged && sectionState(id)?.status === 'locked' ? null : externalTool,
          ...(completion &&
          (!sectionProgress || privileged || sectionState(id)?.status !== 'locked')
            ? { completion }
            : {}),
        }),
      ),
      structureRevision: structure.revision,
      legacyLayout: structure.legacyLayout,
      supportBlockIds: structure.supportBlockIds ?? [],
      requirements: lessonCompletionRequirements({
        ...view,
        sections: structure.sections,
        learningProgress: {
          ...structure.progress,
          sectionId,
          blocks: accessible
            ? structure.progress.blocks.filter((b) => accessible.has(b.blockId))
            : structure.progress.blocks,
        },
        sectionProgress,
      }),
      learningProgress: {
        ...structure.progress,
        sectionId,
        blocks: accessible
          ? structure.progress.blocks.filter((b) => accessible.has(b.blockId))
          : structure.progress.blocks,
      },
    }
  }
}
