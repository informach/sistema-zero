import { ValidationError } from '@sistemazero/core/errors'
import { ZAPPY_KNOWLEDGE_BACKFILL_BATCH_SIZE, zappyVimeoVideoId } from '@sistemazero/core/zappy'
import type {
  ZappyKnowledgeHit,
  ZappyKnowledgeReport,
  ZappyKnowledgeRepository,
  ZappyKnowledgeSourceType,
} from '../../domain/ports/zappy-knowledge-repository.port'
import {
  normalizeZappyText,
  prepareZappyKnowledgeSource,
} from '../../domain/zappy/knowledge-source'
import type { GetMyCourseService } from '../get-my-course/get-my-course.service'
import type { HelpService } from '../help/help.service'
import type { ListMyCoursesService } from '../list-my-courses/list-my-courses.service'

export { normalizeZappyText, richTextToText, vttToText } from '../../domain/zappy/knowledge-source'

/** Tutoriais do "Como fazer" por pergunta: poucos, e sempre depois das aulas liberadas. */
const HELP_HITS_MAX = 3

export interface ZappyKnowledgeSyncInput {
  courseId?: string
  lessonId: string
  sourceType: ZappyKnowledgeSourceType
  sourceRef: string
  expectedBlockRevision: string
  /** VTT cru em `video-vtt`; texto já extraído em PDF; HTML/Markdown em rich-text. */
  content?: string
  error?: string
}

interface ZappyKnowledgePendingBase {
  courseId: string
  lessonId: string
  sourceRef: string
  expectedBlockRevision: string
}

export type ZappyKnowledgePendingExtraction =
  | (ZappyKnowledgePendingBase & {
      sourceType: 'video-vtt'
      extraction:
        | { kind: 'stable-vtt'; location: string }
        | { kind: 'vimeo'; videoId: string }
        | { kind: 'unavailable'; error: string }
    })
  | (ZappyKnowledgePendingBase & {
      sourceType: 'student-notebook'
      extraction: { kind: 'private-pdf'; location: string }
    })

export class ZappyKnowledgeService {
  constructor(
    private readonly repository: ZappyKnowledgeRepository,
    private readonly listMyCourses: ListMyCoursesService,
    private readonly getMyCourse: GetMyCourseService,
    private readonly clock: () => Date,
    /** O "Como fazer": tutoriais publicados entram na busca sem gate de matrícula. */
    private readonly help?: Pick<HelpService, 'searchForZappy'>,
    private readonly adultHelp?: Pick<HelpService, 'searchForZappy'>,
  ) {}

  async sync(
    input: ZappyKnowledgeSyncInput,
  ): Promise<{ id: string | null; status: string; changed: boolean }> {
    const authority = await this.repository.sourceAuthorityForRef(input.sourceRef)
    if (!authority) throw new Error('Fonte publicada do Zappy não encontrada')
    if (authority.lessonId !== input.lessonId) {
      throw new Error('Aula não corresponde à fonte do Zappy')
    }
    // Curso AO VIVO (14/10/2026) nunca entra na base do Zappy. O Admin sincroniza ao publicar
    // QUALQUER aula, então a recusa é um 200 calado (`skipped`), e o que já estivesse indexado
    // (o curso era gravado antes) sai agora, sem esperar a faxina do reconcile.
    if (authority.modality === 'live') {
      await this.repository.deleteByRef(input.sourceRef)
      return { id: null, status: 'skipped', changed: false }
    }
    if (input.courseId && input.courseId !== authority.courseId) {
      throw new Error('Curso não corresponde à aula da fonte do Zappy')
    }
    if ((input.sourceType === 'student-notebook') !== (authority.blockId === null)) {
      throw new ValidationError(
        'Tipo da fonte do Zappy não corresponde ao arquivo ou bloco publicado',
      )
    }
    if (input.expectedBlockRevision !== authority.blockRevision) {
      throw new ValidationError('Fonte do Zappy pertence a uma revisão desatualizada')
    }
    const prepared = prepareZappyKnowledgeSource(input.sourceType, input.content, input.error)
    const result = await this.repository.upsert({
      courseId: authority.courseId,
      lessonId: authority.lessonId,
      blockId: authority.blockId,
      blockRevision: input.expectedBlockRevision,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      ...prepared,
      now: this.clock(),
    })
    if (!result) {
      throw new ValidationError('Fonte do Zappy pertence a uma revisão desatualizada')
    }
    return { ...result, status: prepared.status }
  }

  deleteSource(sourceRef: string): Promise<void> {
    return this.repository.deleteByRef(sourceRef)
  }

  /**
   * Busca somente em cursos comprados + aulas publicadas e já liberadas. Os ids
   * permitidos são derivados pelos casos de uso autoritativos, nunca do cliente.
   */
  async search(input: {
    userId: string
    audience?: 'kids' | 'adult'
    accountId: string
    privileged: boolean
    query: string
    limit?: number
  }): Promise<ZappyKnowledgeHit[]> {
    const courses = await this.listMyCourses.execute(
      input.userId,
      input.privileged,
      input.audience ?? 'kids',
      input.accountId,
    )
    const available = courses.filter((course) => !course.careerLock.locked)
    const details = await Promise.all(
      available.map((course) =>
        this.getMyCourse.execute(
          input.userId,
          course.courseSlug,
          input.privileged,
          input.accountId,
        ),
      ),
    )
    const lessonIds = details.flatMap((course) =>
      course.modules.flatMap((module) =>
        module.lessons.filter((lesson) => !lesson.locked).map((lesson) => lesson.id),
      ),
    )
    const normalized = normalizeZappyText(input.query)
    const [lessonHits, helpHits] = await Promise.all([
      this.repository.search(lessonIds, normalized, input.limit ?? 5),
      // Best-effort: a ajuda nunca derruba a resposta didática.
      (input.audience === 'adult' ? this.adultHelp : this.help)
        ?.searchForZappy(normalized, HELP_HITS_MAX)
        .catch(() => []) ?? [],
    ])
    return [...lessonHits, ...helpHits]
  }

  /** Indexa texto rico e devolve os downloads externos que o admin precisa extrair. */
  async backfill(input: { cursor?: string; limit?: number } = {}): Promise<{
    indexed: number
    deleted: number
    pending: ZappyKnowledgePendingExtraction[]
    nextCursor: string | null
    done: boolean
  }> {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), ZAPPY_KNOWLEDGE_BACKFILL_BATCH_SIZE)
    if (input.cursor?.startsWith('notebook:')) {
      const after = input.cursor.slice('notebook:'.length)
      const listed = await this.repository.listPublishedKidsNotebooks({
        ...(after ? { after } : {}),
        limit: limit + 1,
      })
      const hasMore = listed.length > limit
      const notebooks = listed.slice(0, limit)
      return {
        indexed: 0,
        deleted: hasMore ? 0 : await this.repository.reconcilePublishedSources(),
        pending: notebooks.map((notebook) => ({
          courseId: notebook.courseId,
          lessonId: notebook.lessonId,
          sourceType: 'student-notebook' as const,
          sourceRef: `attachment:${notebook.attachmentId}`,
          expectedBlockRevision: notebook.attachmentRevision,
          extraction: { kind: 'private-pdf' as const, location: notebook.url },
        })),
        nextCursor: hasMore ? `notebook:${notebooks.at(-1)?.attachmentId}` : null,
        done: !hasMore,
      }
    }
    const listed = await this.repository.listPublishedKidsBlocks({
      ...(input.cursor ? { after: input.cursor } : {}),
      limit: limit + 1,
    })
    const hasMore = listed.length > limit
    const blocks = listed.slice(0, limit)
    let indexed = 0
    const pending: ZappyKnowledgePendingExtraction[] = []
    for (const block of blocks) {
      const sourceRef = `block:${block.blockId}`
      // O balão de fala do mascote carrega justamente a INSTRUÇÃO da aula ("agora
      // você vai…"), que antes vivia em texto corrido. Se ele não entrasse aqui,
      // migrar a instrução de `rich_text` para `dialogue` REMOVERIA conhecimento
      // da base: a linha antiga é apagada na reconciliação e a nova nunca entra, e
      // o Zappy passaria a responder "o que eu faço agora?" sem saber.
      if (block.content.kind === 'rich_text' || block.content.kind === 'dialogue') {
        await this.sync({
          courseId: block.courseId,
          lessonId: block.lessonId,
          sourceType: 'rich-text',
          sourceRef,
          expectedBlockRevision: block.blockRevision,
          content:
            block.content.kind === 'dialogue'
              ? block.content.text
              : (block.content.markdown ?? block.content.html ?? ''),
        })
        indexed += 1
      } else if (block.content.kind === 'video') {
        const location = block.content.captions?.[0]?.url
        if (location) {
          pending.push({
            courseId: block.courseId,
            lessonId: block.lessonId,
            sourceType: 'video-vtt',
            sourceRef,
            expectedBlockRevision: block.blockRevision,
            extraction: { kind: 'stable-vtt', location },
          })
        } else {
          const videoId = zappyVimeoVideoId(block.content.provider, block.content.src)
          pending.push({
            courseId: block.courseId,
            lessonId: block.lessonId,
            sourceType: 'video-vtt',
            sourceRef,
            expectedBlockRevision: block.blockRevision,
            extraction: videoId
              ? { kind: 'vimeo', videoId }
              : { kind: 'unavailable', error: 'Vídeo publicado sem transcrição compatível' },
          })
        }
      }
    }
    return {
      indexed,
      deleted: 0,
      pending,
      nextCursor: hasMore ? (blocks.at(-1)?.blockId ?? null) : 'notebook:',
      done: false,
    }
  }

  report(): Promise<ZappyKnowledgeReport> {
    return this.repository.report()
  }
}
