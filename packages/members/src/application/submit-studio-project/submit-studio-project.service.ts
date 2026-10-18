import { createHash } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import { type GallerySubmission, isGallerySubmission } from '@sistemazero/core/learning'
import type { Logger } from '@sistemazero/core/logging'
import { STUDIO_PROJECT_FORMAT_VERSION } from '@sistemazero/core/studio'
import { pintaAssetFromWire, pintaAssetToWire } from '@sistemazero/pinta/assets'
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
  MAX_SUBMISSION_MESSAGE_CHARS,
  type SubmissionBlockKind,
} from '../../domain/course/lesson-block'
import { deterministicSourceId } from '../../domain/gamification/source-id'
import { LearningConflictError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import type { SectionProgressionService } from '../learning/section-progression.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { TeacherThreadsService } from '../teacher-threads/teacher-threads.service'

// Namespace fixo para tornar o retry do MESMO envio idempotente no histórico.
const STUDIO_SUBMIT_NOTE_NAMESPACE = '4a250e86-0c7b-4a2e-8f07-b3a12715e5b6'

export interface StudioSubmissionResultView {
  submittedAt: string
}

/**
 * Tudo o que é OPCIONAL na entrega (14/10/2026: era uma fila de argumentos posicionais e cada
 * campo novo empurrava `undefined` em todos os chamadores). Ausente = o comportamento clássico.
 */
export interface SubmitStudioProjectOptions {
  /** Recado OPCIONAL do aluno ao professor. Em branco = sem recado. */
  message?: string | null
  /**
   * O recado foi FALADO e transcrito pelo servidor (voz para texto). Sem recado, não vale nada:
   * a entrega grava `false`.
   */
  messageSpoken?: boolean
  privileged?: boolean
  /** Conta responsável (sessão de perfil); ausente = a própria conta é o `userId`. */
  accountId?: string
  /** Nome de EXIBIÇÃO do aluno (header confiável do gateway) p/ o turno na conversa. */
  authorName?: string | null
  /** Bloco que esta entrega atende. Default `studio` — zero regressão no caminho existente. */
  kind?: SubmissionBlockKind
  /** Only the authenticated gallery service can supply a validated immutable snapshot. */
  gallery?: { snapshot: GallerySubmission; revision: string }
  /** Impressão digital do conteúdo enviado ("envio em dia"); a galeria não tem. */
  fingerprint?: string | null
}

/**
 * Qual bloco esta entrega atende. ⭐ O Pinta REUSA esta rota, este service e a tabela
 * `studio_submissions` inteira: o que muda é o kind exigido, o teto de tamanho e o nome na copy
 * do erro. Duplicar tudo obrigaria a duplicar também a fila do professor, o status
 * pendente/respondida/conferida, a conversa de Recados e a ficha 360 — nada disso olha o formato
 * do payload. Dívida assumida: o nome da tabela passa a mentir um pouco (é "entrega de aula").
 */
const SUBMISSION_LIMITS: Record<SubmissionBlockKind, { maxChars: number; notFound: () => Error }> =
  {
    studio: { maxChars: MAX_STUDIO_PROJECT_CHARS, notFound: () => new StudioBlockNotFoundError() },
    pinta: { maxChars: MAX_PINTA_ASSET_CHARS, notFound: () => new PintaBlockNotFoundError() },
  }

/**
 * Recebe a ENTREGA do projeto do Estúdio (ou do desenho do Pinta). Upsert por aluno+bloco
 * (último vence). A entrega é só a entrega à equipe: os objetivos da parte são conferidos
 * pelo "Verificar esta parte" (`SectionProgressionService.checkProject`), nunca aqui. A
 * existência da entrega destrava a conclusão da aula (gate em mark-lesson-complete).
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
    private readonly sections: SectionProgressionService,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    project: unknown,
    options: SubmitStudioProjectOptions = {},
  ): Promise<StudioSubmissionResultView> {
    const {
      message = null,
      messageSpoken = false,
      privileged = false,
      accountId,
      authorName = null,
      kind = 'studio',
      gallery,
      fingerprint = null,
    } = options
    const contentFingerprint = gallery ? null : fingerprint
    const limits = SUBMISSION_LIMITS[kind]
    // Recado do aluno ao professor: trim → vazio vira null (não guarda " ").
    const note = message?.trim() ? message.trim() : null
    // O recado é espelhado na conversa ANTES do upsert e a coluna é `varchar(1000)`: um recado
    // longo demais precisa parar aqui, sem efeito colateral, e não virar 500 no banco depois do
    // turno gravado. As bordas HTTP já recusam pelo mesmo teto; esta é a rede para quem chamar
    // o serviço por outro caminho.
    if (note !== null && note.length > MAX_SUBMISSION_MESSAGE_CHARS) {
      throw new ValidationError(
        `O recado para o professor pode ter até ${MAX_SUBMISSION_MESSAGE_CHARS} caracteres.`,
      )
    }
    // A marca da voz acompanha o recado: sem recado não há o que ler com boa vontade.
    const noteSpoken = note !== null && messageSpoken === true
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno → não aceita entregas.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    // Acesso pela CONTA (sessão de perfil); a entrega fica no userId (o perfil).
    const { course } = await this.checkAccess.requireById(
      accountId ?? userId,
      lesson.courseId,
      privileged,
      userId,
      { lessonId },
    )
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== kind || block.content.purpose === 'experiment')
      throw limits.notFound()
    await this.sections.assertBlock(
      { userId, accountId: accountId ?? userId },
      lesson,
      blockId,
      privileged,
      true,
    )

    // Aula EM PRODUÇÃO ("em breve"): a 4ª porta lateral. Com a aba ainda aberta, o
    // "Enviar para o professor" passaria e o upsert último-vence SOBRESCREVERIA a
    // entrega boa anterior, além de gravar marco, creditar XP e abrir conversa numa
    // aula que o servidor declara não-servida.
    if (!privileged && hasComingSoonBlock(lesson.blocks)) throw limits.notFound()

    if (
      Boolean(block.content.gallery) !== Boolean(gallery) ||
      (isGallerySubmission(project) && !gallery)
    )
      throw new ValidationError('Use a seleção da galeria para enviar esta atividade.')
    if (gallery && gallery.revision !== block.contentRevision) throw new LearningConflictError()

    // O desenho cruza HTTP/jsonb como arrays JSON. A borda restaura os typed arrays,
    // valida toda a estrutura e serializa novamente no formato estável de transporte.
    // Assim uma linha incompleta jamais conta como entrega para o gate da aula.
    let submissionProject = gallery?.snapshot ?? project
    if (kind === 'pinta' && !gallery) {
      const asset = pintaAssetFromWire(project)
      if (!asset) throw new ValidationError('O desenho do Pinta é inválido')
      submissionProject = pintaAssetToWire(asset)
    }

    // Teto de tamanho do jsonb (anti-DoS), aplicado ao payload canônico persistido.
    if (JSON.stringify(submissionProject).length > limits.maxChars) {
      throw new PayloadTooLargeError('Projeto excede o tamanho máximo permitido')
    }

    if (
      kind === 'studio' &&
      !gallery &&
      (!project ||
        typeof project !== 'object' ||
        !('formatVersion' in project) ||
        project.formatVersion !== STUDIO_PROJECT_FORMAT_VERSION)
    )
      throw new ValidationError(
        'Atualize a página e abra o projeto no Estúdio antes de enviar esta versão.',
      )

    const submittedAt = this.clock()
    // O recado é a confirmação da entrega para a equipe. Persiste-o antes da linha "último
    // vence": se o canal estiver indisponível, a entrega não é parcialmente confirmada e o
    // aluno pode reenviar com segurança.
    await this.mirrorSubmitNote({
      note,
      noteSpoken,
      userId,
      accountId: accountId ?? userId,
      audience: course.audience,
      blockId,
      courseId: lesson.courseId,
      lessonId,
      title: lesson.title,
      authorName,
      project: submissionProject,
    })
    await this.submissions.upsert(
      {
        id: this.newId(),
        userId,
        accountId: accountId ?? userId,
        blockId,
        lessonId,
        courseId: lesson.courseId,
        project: submissionProject,
        submittedAt,
        message: note,
        messageSpoken: noteSpoken,
        contentFingerprint,
      },
      { revision: block.contentRevision, galleryRequestId: gallery?.snapshot.requestId },
    )
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
    /** O recado foi falado e transcrito (voz para texto): o turno espelhado leva a marca. */
    noteSpoken: boolean
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
        spoken: args.noteSpoken,
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
