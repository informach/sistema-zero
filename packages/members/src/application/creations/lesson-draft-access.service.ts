import { isGalleryBlock } from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import {
  LESSON_CREATION_BLOCK_KIND,
  type LessonCreationTool,
} from '../../domain/creations/creation'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { SectionProgressionService } from '../learning/section-progression.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'

/** O autosave da fase reserva a cada poucos segundos: a mesma resposta vale por um minuto. */
const ACCESS_TTL_MS = 60_000
const MAX_CACHED = 5_000

/**
 * Quem pode guardar na conta o rascunho do Estúdio ou do Pinta de um bloco de aula (10/10/2026).
 *
 * A régua é a da FASE, não a da posse do produto: a aula publicada (sem "Em breve"), o curso
 * liberado à conta, a aula destravada e o bloco numa parte já aberta, do tipo da ferramenta e
 * fora da galeria de entrega. É o mesmo caminho que a entrega da galeria percorre
 * (`GalleryDeliveryService.prepare`), sem o `submission`.
 *
 * Só a reserva passa por aqui: listar, baixar e apagar o que já é seu continuam abertos, como nas
 * ferramentas livres (a criança sempre traz de volta o que guardou).
 */
export class LessonDraftAccessService {
  private readonly allowedUntil = new Map<string, number>()

  constructor(
    private readonly courses: CourseRepository,
    private readonly access: CheckAccessService,
    private readonly progress: ProgressRepository,
    private readonly sections: SectionProgressionService,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  async assert(input: {
    userId: string
    accountId: string
    privileged: boolean
    tool: LessonCreationTool
    blockId: string
  }): Promise<void> {
    const cacheKey = `${input.accountId}:${input.userId}:${input.tool}:${input.blockId}`
    const now = this.clock()
    if ((this.allowedUntil.get(cacheKey) ?? 0) > now) return
    const lessonId = await this.courses.findBlockLessonId(input.blockId)
    const lesson = lessonId ? await this.courses.findLessonWithContent(lessonId) : null
    if (!lesson?.isPublished || hasComingSoonBlock(lesson.blocks)) throw new LessonNotFoundError()
    const block = lesson.blocks.find((b) => b.id === input.blockId)
    if (
      !block ||
      block.kind !== LESSON_CREATION_BLOCK_KIND[input.tool] ||
      isGalleryBlock(block.content)
    )
      throw new LessonNotFoundError('Esta atividade não guarda rascunho na conta.')
    const { course } = await this.access.requireById(
      input.accountId,
      lesson.courseId,
      input.privileged,
      input.userId,
    )
    await assertLessonUnlocked(
      this.courses,
      this.progress,
      course,
      lesson.id,
      input.userId,
      input.privileged,
    )
    await this.sections.assertBlock(
      { userId: input.userId, accountId: input.accountId },
      lesson,
      input.blockId,
      input.privileged,
    )
    if (this.allowedUntil.size >= MAX_CACHED) this.allowedUntil.clear()
    this.allowedUntil.set(cacheKey, now + ACCESS_TTL_MS)
  }
}
