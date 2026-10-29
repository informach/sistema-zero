import {
  type ArtSlotImportMode,
  type StudioArtSlotImport,
  studioArtSlotsIssue,
} from '@sistemazero/core/learning'
import { LessonNotFoundError, StudioBlockNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { SectionProgressionService } from '../learning/section-progression.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'

/** Uma vaga que o jogo importa, com o desenho que a criança entregou para ela. */
export interface ArtSlotView {
  name: string
  mode: ArtSlotImportMode
  /** A imagem do jogo que o desenho substitui (o `replaces` da vaga no bloco de Pinta). */
  replaces: string | null
  /** O `PintaAsset` da última entrega do PRÓPRIO perfil; `null` sem desenho entregue. */
  asset: unknown | null
}

export interface ArtSlotsView {
  slots: ArtSlotView[]
}

/**
 * Os desenhos que o bloco de Estúdio importa (etapa 3 de
 * `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`). Para cada vaga do bloco, acha o
 * bloco de Pinta PUBLICADO do mesmo curso que a preenche e devolve a última entrega do perfil
 * nele. Régua do carryover: acesso pela CONTA, conteúdo pelo PERFIL, e a mesma porta (aula
 * publicada, liberada, bloco numa parte aberta). Vaga sem desenho volta com `asset: null`: o jogo
 * segue com as imagens dele, nunca quebra.
 *
 * Lazy como o carryover: o member-shell chama ao montar o projeto do bloco, e um desenho pode
 * pesar até `MAX_PINTA_ASSET_CHARS`.
 */
export class GetArtSlotsService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly sections: SectionProgressionService,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    privileged = false,
    accountId?: string,
  ): Promise<ArtSlotsView> {
    const lesson = await this.courses.findLessonWithContent(lessonId, { includeAttachments: false })
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const { course } = await this.checkAccess.requireById(
      accountId ?? userId,
      lesson.courseId,
      privileged,
      userId,
      { lessonId },
    )
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)
    await this.sections.assertBlock(
      { userId, accountId: accountId ?? userId },
      lesson,
      blockId,
      privileged,
    )
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'studio') throw new StudioBlockNotFoundError()

    // Vagas ILEGÍVEIS valem como nenhuma: a forma é recusada ao gravar, e a leitura não derruba
    // o bloco da criança por uma linha antiga.
    const declared = block.content.artSlots
    const slots: StudioArtSlotImport[] =
      declared && studioArtSlotsIssue(declared) === null ? declared : []
    if (!slots.length) return { slots: [] }

    const fillers = await this.courses.findArtSlotFillers(
      lesson.courseId,
      slots.map((slot) => slot.name),
    )
    return {
      slots: await Promise.all(
        slots.map(async (slot) => {
          const filler = fillers.get(slot.name)
          // Só a entrega do PRÓPRIO perfil: nunca o desenho de outra criança.
          const submission = filler ? await this.submissions.getOne(userId, filler.blockId) : null
          return {
            name: slot.name,
            mode: slot.mode,
            replaces: filler?.replaces ?? null,
            asset: submission?.project ?? null,
          }
        }),
      ),
    }
  }
}
