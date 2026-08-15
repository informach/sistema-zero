import { createHash } from 'node:crypto'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import type { CourseAudience } from '../../domain/course/course'
import {
  LessonNotFoundError,
  PintaBlockNotFoundError,
  StudioBlockNotFoundError,
} from '../../domain/course/course.errors'
import {
  hasComingSoonBlock,
  MAX_PINTA_ASSET_CHARS,
  MAX_STUDIO_PROJECT_CHARS,
} from '../../domain/course/lesson-block'
import {
  type ClientCheckResult,
  gradeStudioActivity,
  type StudioCheckResult,
} from '../../domain/course/studio-activity'
import { deterministicSourceId } from '../../domain/gamification/source-id'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { GamificationDeltaView } from '../mappers/views'
import type { TeacherThreadsService } from '../teacher-threads/teacher-threads.service'

// Namespace fixo para tornar o retry do MESMO envio idempotente no histórico.
const STUDIO_SUBMIT_NOTE_NAMESPACE = '4a250e86-0c7b-4a2e-8f07-b3a12715e5b6'

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
 * Qual bloco esta entrega atende. ⭐ O Pinta REUSA esta rota, este service e a tabela
 * `studio_submissions` inteira: o que muda é o kind exigido, o teto de tamanho e o nome na copy
 * do erro. Duplicar tudo obrigaria a duplicar também a fila do professor, o status
 * pendente/respondida/conferida, a conversa de Recados e a ficha 360 — nada disso olha o formato
 * do payload. Dívida assumida: o nome da tabela passa a mentir um pouco (é "entrega de aula").
 */
export type SubmissionBlockKind = 'studio' | 'pinta'

const SUBMISSION_LIMITS: Record<SubmissionBlockKind, { maxChars: number; notFound: () => Error }> =
  {
    studio: { maxChars: MAX_STUDIO_PROJECT_CHARS, notFound: () => new StudioBlockNotFoundError() },
    pinta: { maxChars: MAX_PINTA_ASSET_CHARS, notFound: () => new PintaBlockNotFoundError() },
  }

/**
 * Recebe a ENTREGA do projeto do Estúdio (ou do desenho do Pinta). Upsert por aluno+bloco
 * (último vence).
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
    private readonly teacherThreads: TeacherThreadsService,
    private readonly logger: Logger,
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
    /** Nome de EXIBIÇÃO do aluno (header confiável do gateway) p/ o turno na conversa. */
    authorName: string | null = null,
    /** Bloco que esta entrega atende. Default `studio` — zero regressão no caminho existente. */
    kind: SubmissionBlockKind = 'studio',
  ): Promise<StudioSubmissionResultView> {
    const limits = SUBMISSION_LIMITS[kind]
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
      userId,
    )
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)

    // Aula EM PRODUÇÃO ("em breve"): a 4ª porta lateral. Com a aba ainda aberta, o
    // "Enviar para o professor" passaria e o upsert último-vence SOBRESCREVERIA a
    // entrega boa anterior, além de gravar marco, creditar XP e abrir conversa numa
    // aula que o servidor declara não-servida.
    if (!privileged && hasComingSoonBlock(lesson.blocks)) throw limits.notFound()

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== kind) throw limits.notFound()

    // Teto de tamanho do jsonb (anti-DoS) — o front sanitiza o shape; aqui só o peso.
    if (JSON.stringify(project).length > limits.maxChars) {
      throw new PayloadTooLargeError('Projeto excede o tamanho máximo permitido')
    }

    const submittedAt = this.clock()
    // Auto-correção é do Estúdio: o bloco de Pinta é só entrega (a régua de "desenho certo" não
    // existe e ficou explicitamente fora de escopo).
    const activity = block.content.kind === 'studio' ? block.content.activity : undefined

    // Bloco sem atividade: comportamento clássico (só entrega).
    if (!activity) {
      // O recado é a confirmação da entrega para a equipe. Persiste-o antes da
      // linha "último vence": se o canal estiver indisponível, a entrega não é
      // parcialmente confirmada e o aluno pode reenviar com segurança.
      await this.mirrorSubmitNote({
        note,
        userId,
        accountId: accountId ?? userId,
        audience: course.audience,
        blockId,
        courseId: lesson.courseId,
        lessonId,
        title: lesson.title,
        authorName,
        project,
      })
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

    await this.mirrorSubmitNote({
      note,
      userId,
      accountId: accountId ?? userId,
      audience: course.audience,
      blockId,
      courseId: lesson.courseId,
      lessonId,
      title: lesson.title,
      authorName,
      project,
    })

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

  /**
   * Espelha o recado do ENVIO na conversa professor↔aluno (contexto `studio_submission`,
   * ref = blockId) para o HISTÓRICO sobreviver ao reenvio — o upsert acima sobrescreve o
   * `message` da linha da entrega, mas cada recado vira um turno permanente do aluno na
   * conversa (o professor vê tudo no painel da Entrega). A confirmação do envio só
   * acontece se o espelho também persistir: falha é devolvida para o cliente tentar
   * novamente, com id determinístico para não duplicar o turno. No-op sem recado.
   */
  private async mirrorSubmitNote(args: {
    note: string | null
    userId: string
    accountId: string
    audience: CourseAudience
    blockId: string
    courseId: string
    lessonId: string
    title: string | null
    authorName: string | null
    project: unknown
  }): Promise<void> {
    if (!args.note) return
    const projectHash = createHash('sha256').update(JSON.stringify(args.project)).digest('hex')
    try {
      await this.teacherThreads.studentPostByContext({
        userId: args.userId,
        accountId: args.accountId,
        audience: args.audience,
        contextType: 'studio_submission',
        contextRef: args.blockId,
        courseId: args.courseId,
        lessonId: args.lessonId,
        title: args.title,
        authorName: args.authorName,
        body: args.note,
        dedupeId: deterministicSourceId(
          STUDIO_SUBMIT_NOTE_NAMESPACE,
          `${args.userId}:${args.blockId}:${projectHash}:${args.note}`,
        ),
      })
    } catch (error) {
      this.logger.error('teacher_thread.submit_note_failed', {
        userId: args.userId,
        blockId: args.blockId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
