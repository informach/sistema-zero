import { LessonNotFoundError, StudioBlockNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'

/** Projeto carregado da aula contínua anterior (mesma cadeia). `null` se não há. */
export interface StudioCarryoverView {
  /** Snapshot `Project` da última entrega do aluno no bloco anterior da cadeia. */
  project: unknown | null
}

/**
 * Carrega o projeto da AULA CONTÍNUA ANTERIOR para um bloco de Estúdio marcado como
 * parte de uma cadeia (`chain`). O front chama isto SÓ na 1ª abertura (sem rascunho
 * local) para semear o editor — o aluno continua de onde parou. Lazy de propósito: o
 * projeto pode ser pesado (até 1.5 MB) e o GET da aula não o carrega.
 *
 * O "salvar" é a própria ENTREGA (`submit-studio-project`): cada aula da cadeia grava
 * o projeto do aluno, e a aula seguinte o recupera. Sem entrega na anterior → `null`
 * (cai no `initialProject` do bloco). Carrega a última entrega MESMO sem ter batido a
 * nota de corte (decisão de produto: continuar o WIP).
 */
export class GetStudioCarryoverService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly submissions: StudioSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    privileged = false,
    accountId?: string,
  ): Promise<StudioCarryoverView> {
    // Só usa os blocos (estúdio) — pula a query de anexos.
    const lesson = await this.courses.findLessonWithContent(lessonId, { includeAttachments: false })
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    // Acesso pela CONTA (sessão de perfil); os dados (entrega) são do PERFIL (userId).
    const { course } = await this.checkAccess.requireById(
      accountId ?? userId,
      lesson.courseId,
      privileged,
    )
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'studio') throw new StudioBlockNotFoundError()

    // Sem nome de cadeia = aula independente: não há projeto anterior a carregar.
    const chain = block.content.chain?.trim()
    if (!chain) return { project: null }

    const prev = await this.courses.findPrecedingStudioBlockInChain(
      lesson.courseId,
      lessonId,
      chain,
    )
    // 1ª aula da cadeia (sem antecessora na mesma cadeia) → começa do template.
    if (!prev) return { project: null }

    // Última entrega do PRÓPRIO aluno/perfil no bloco anterior. Nunca enviou → null.
    const sub = await this.submissions.getOne(userId, prev.blockId)
    return { project: sub?.project ?? null }
  }
}
