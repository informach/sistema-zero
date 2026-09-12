import {
  isLegacyMaterialLesson,
  isVideoOnlySection,
  lessonCompletionRequirements,
} from '@sistemazero/core/learning'
import {
  CertificateGateNotIssuedError,
  LessonComingSoonError,
  LessonNotFoundError,
  PintaGateNotSubmittedError,
  QuizGateNotPassedError,
  StudioGateNotPassedError,
  StudioGateNotSubmittedError,
} from '../../domain/course/course.errors'
import { LearningGateError, SectionGateError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import type { LearningService } from '../learning/learning.service'
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
    private readonly learning: LearningService,
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
      userId,
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

      const [learning, quizStates, studioStates] = await Promise.all([
        this.learning.read({ userId, accountId: accountId ?? userId }, lesson),
        this.quizAttempts.summarizeByBlockIds(
          userId,
          lesson.blocks.filter((b) => b.kind === 'quiz').map((b) => b.id),
        ),
        this.studioSubmissions.summarizeByBlockIds(
          userId,
          lesson.blocks.filter((b) => b.kind === 'studio' || b.kind === 'pinta').map((b) => b.id),
        ),
      ])
      const sectionProgress = await this.learning.sections.read(
        { userId, accountId: accountId ?? userId },
        lesson,
      )
      const requirements = lessonCompletionRequirements({
        sectionProgress: learning.legacyLayout ? undefined : sectionProgress,
        videoBlockIds: learning.legacyLayout
          ? learning.sections
              .filter((s) => isVideoOnlySection(s, lesson.blocks))
              .flatMap((s) => s.completion?.blockIds ?? [])
          : [],
        materialBlockIds:
          learning.legacyLayout && isLegacyMaterialLesson(lesson.blocks)
            ? lesson.blocks.filter((b) => b.kind === 'ebook').map((b) => b.id)
            : [],
        completed: false,
        sections: learning.sections,
        learningProgress: learning.progress,
        blocks: lesson.blocks.map((b) => ({
          ...b,
          blockRevision: b.contentRevision,
          quizState: { passed: quizStates.get(b.id)?.everPassed ?? false },
          studioState: {
            submitted: studioStates.has(b.id),
            passed: studioStates.get(b.id)?.passed ?? false,
          },
          pintaState: { submitted: studioStates.has(b.id) },
        })),
      })
      const missing = requirements.find((r) => !r.complete)
      if (missing) {
        switch (missing.reason) {
          case 'SECTION_GATE_INCOMPLETE':
          case 'VIDEO_GATE_NOT_WATCHED':
          case 'MATERIAL_GATE_NOT_ACCESSED':
            throw new SectionGateError()
          case 'LESSON_COMING_SOON':
            throw new LessonComingSoonError()
          case 'LEARNING_GATE_INCOMPLETE':
            throw new LearningGateError()
          case 'QUIZ_GATE_NOT_PASSED':
            throw new QuizGateNotPassedError()
          case 'STUDIO_GATE_NOT_SUBMITTED':
            throw new StudioGateNotSubmittedError()
          case 'STUDIO_GATE_NOT_PASSED':
            throw new StudioGateNotPassedError()
          case 'PINTA_GATE_NOT_SUBMITTED':
            throw new PintaGateNotSubmittedError()
          case 'CERTIFICATE_GATE_NOT_ISSUED':
            throw new CertificateGateNotIssuedError()
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

    // Fechou a unidade? TODAS as aulas publicadas do módulo concluídas. Isso NÃO
    // paga nada: o prêmio é do baú da trilha, que a criança abre com um clique.
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
      // O delta vem do ledger e não sabe de unidade fechada (o evento do baú só
      // nasce no clique). Quem sabe é aqui, pelo outline.
      gamification: gamification ? { ...gamification, unitCompleted } : null,
      showcase,
    }
  }
}
