import { PayloadTooLargeError } from '@sistemazero/core/http'
import { LessonNotFoundError, StudioBlockNotFoundError } from '../../domain/course/course.errors'
import { MAX_STUDIO_PROJECT_CHARS } from '../../domain/course/lesson-block'
import {
  type ClientCheckResult,
  gradeStudioActivity,
  type StudioCheckResult,
} from '../../domain/course/studio-activity'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { GamificationDeltaView } from '../mappers/views'

export interface StudioSubmissionResultView {
  submittedAt: string
  // ── Auto-correção (presentes só quando o bloco tem atividade) ────────────────
  /** Nota 0–100 gravada (recálculo de `structure` no servidor + reportado do cliente). */
  score?: number
  /** Atingiu a nota de corte? (sem `passingScore` = sempre true, formativa). */
  passed?: boolean
  /** Resultado por checagem (com `verifiedBy`). */
  results?: StudioCheckResult[]
  /** Delta de gamificação quando passou (XP/streak/badges) — `null` se award falhou. */
  gamification?: GamificationDeltaView | null
}

/**
 * Recebe a ENTREGA do projeto do Estúdio. Upsert por aluno+bloco (último vence).
 * Quando o bloco tem ATIVIDADE (fase 2), GRADEIA na entrega: recalcula `structure`
 * no servidor + registra o reportado pelo cliente (`results`), grava nota/`passed_at`
 * STICKY e dá award de XP quando passa (espelha o quiz). A existência da entrega (ou
 * a aprovação, se houver `passingScore`) destrava a conclusão da aula (gate em
 * mark-lesson-complete).
 */
export class SubmitStudioProjectService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly gamification: AwardGamificationService,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    project: unknown,
    clientResults: readonly ClientCheckResult[] = [],
    message: string | null = null,
    privileged = false,
    accountId?: string,
  ): Promise<StudioSubmissionResultView> {
    // Recado do aluno ao professor: trim → vazio vira null (não guarda " ").
    const note = message?.trim() ? message.trim() : null
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno → não aceita entregas.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    // Acesso pela CONTA (sessão de perfil); a entrega fica no userId (o perfil).
    const { course } = await this.checkAccess.requireById(
      accountId ?? userId,
      lesson.courseId,
      privileged,
    )
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'studio') throw new StudioBlockNotFoundError()

    // Teto de tamanho do jsonb (anti-DoS) — o front sanitiza o shape; aqui só o peso.
    if (JSON.stringify(project).length > MAX_STUDIO_PROJECT_CHARS) {
      throw new PayloadTooLargeError('Projeto excede o tamanho máximo permitido')
    }

    const submittedAt = this.clock()
    const activity = block.content.activity

    // Bloco sem atividade: comportamento clássico (só entrega).
    if (!activity) {
      await this.submissions.upsert({
        id: this.newId(),
        userId,
        accountId: accountId ?? userId,
        blockId,
        lessonId,
        courseId: lesson.courseId,
        project,
        submittedAt,
        message: note,
      })
      // Marco de missão "enviar ao professor" (amount 0, idempotente por bloco).
      await this.gamification.awardStudioSubmitted({
        userId,
        accountId: accountId ?? userId,
        blockId,
        audience: course.audience,
        privileged,
      })
      return { submittedAt: submittedAt.toISOString() }
    }

    // Com atividade: gradeia (structure recalc no servidor + reportado do cliente).
    const grade = gradeStudioActivity(activity, project, clientResults)
    // `passed_at` é STICKY: aprovou uma vez = destrava para sempre (não regride no
    // reenvio pior). O repositório mantém o valor existente com bloqueio advisory.
    const passedAt = grade.passed ? submittedAt : null

    await this.submissions.upsert(
      {
        // id só vale no INSERT novo; no conflito o onConflictDoUpdate preserva a linha.
        id: this.newId(),
        userId,
        accountId: accountId ?? userId,
        blockId,
        lessonId,
        courseId: lesson.courseId,
        project,
        submittedAt,
        score: grade.score,
        results: grade.results,
        checkedAt: submittedAt,
        passedAt,
        message: note,
      },
      { preservePassedAt: true },
    )

    // Marco de missão "enviar ao professor" (amount 0, idempotente por bloco) — SEMPRE
    // que entrega, independentemente de nota. Distinto do `studio_passed` (XP quando
    // passa): ambos deduplicam por bloco, então não há XP dobrado.
    await this.gamification.awardStudioSubmitted({
      userId,
      accountId: accountId ?? userId,
      blockId,
      audience: course.audience,
      privileged,
    })

    // Award SÓ quando passou agora (idempotente por bloco no ledger).
    const gamification = grade.passed
      ? await this.gamification.awardStudioPassed({
          userId,
          accountId: accountId ?? userId,
          blockId,
          score: grade.score,
          audience: course.audience,
          privileged,
        })
      : null

    return {
      submittedAt: submittedAt.toISOString(),
      score: grade.score,
      passed: grade.passed,
      results: grade.results,
      gamification,
    }
  }
}
