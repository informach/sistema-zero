import { createHash } from 'node:crypto'
import type {
  ZappyKnowledgeHit,
  ZappyKnowledgeReport,
  ZappyKnowledgeRepository,
  ZappyKnowledgeSourceType,
} from '../../domain/ports/zappy-knowledge-repository.port'
import type { GetMyCourseService } from '../get-my-course/get-my-course.service'
import type { ListMyCoursesService } from '../list-my-courses/list-my-courses.service'

const MAX_SOURCE_CHARS = 500_000
const CHUNK_CHARS = 1_500
const CHUNK_OVERLAP = 180

export function normalizeZappyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Converte VTT em texto sem timestamps, ids de cue ou metadados. */
export function vttToText(vtt: string): string {
  const spoken: string[] = []
  let skippingMetadataBlock = false
  for (const line of vtt.replace(/^\uFEFF?WEBVTT[^\n]*\n?/i, '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      skippingMetadataBlock = false
      continue
    }
    if (/^(NOTE|STYLE|REGION)(?:\s|$)/.test(trimmed)) {
      skippingMetadataBlock = true
      continue
    }
    if (skippingMetadataBlock || /^\d+$/.test(trimmed) || /-->/.test(trimmed)) continue
    spoken.push(trimmed)
  }
  return spoken
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()
}

export function richTextToText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[^\n]*\n?/g, ' '))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)(?:\{[^}]*\})?/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function chunksFor(text: string): Array<{ content: string; normalizedText: string }> {
  const safe = text.slice(0, MAX_SOURCE_CHARS).replace(/\s+/g, ' ').trim()
  if (!safe) return []
  const chunks: Array<{ content: string; normalizedText: string }> = []
  let start = 0
  while (start < safe.length) {
    let end = Math.min(safe.length, start + CHUNK_CHARS)
    if (end < safe.length) {
      const boundary = safe.lastIndexOf(' ', end)
      if (boundary > start + CHUNK_CHARS / 2) end = boundary
    }
    const content = safe.slice(start, end).trim()
    if (content) chunks.push({ content, normalizedText: normalizeZappyText(content) })
    if (end >= safe.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP)
  }
  return chunks
}

export interface ZappyKnowledgeSyncInput {
  courseId?: string
  lessonId: string
  sourceType: ZappyKnowledgeSourceType
  sourceRef: string
  /** VTT cru em `video-vtt`; texto já extraído em PDF; HTML/Markdown em rich-text. */
  content?: string
  error?: string
}

export interface ZappyKnowledgePendingExtraction {
  courseId: string
  lessonId: string
  sourceType: 'video-vtt' | 'student-notebook'
  sourceRef: string
  location: string
}

export class ZappyKnowledgeService {
  constructor(
    private readonly repository: ZappyKnowledgeRepository,
    private readonly listMyCourses: ListMyCoursesService,
    private readonly getMyCourse: GetMyCourseService,
    private readonly clock: () => Date,
  ) {}

  async sync(
    input: ZappyKnowledgeSyncInput,
  ): Promise<{ id: string; status: string; changed: boolean }> {
    const authoritativeCourseId = await this.repository.courseIdForLesson(input.lessonId)
    if (!authoritativeCourseId) throw new Error('Aula da fonte do Zappy não encontrada')
    if (input.courseId && input.courseId !== authoritativeCourseId) {
      throw new Error('Curso não corresponde à aula da fonte do Zappy')
    }
    const raw = input.content ?? ''
    const text = input.sourceType === 'video-vtt' ? vttToText(raw) : richTextToText(raw)
    const chunks = chunksFor(text)
    const status = input.error ? 'error' : chunks.length > 0 ? 'ready' : raw ? 'empty' : 'pending'
    const result = await this.repository.upsert({
      courseId: authoritativeCourseId,
      lessonId: input.lessonId,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      contentHash: createHash('sha256').update(raw).digest('hex'),
      status,
      error:
        input.error?.slice(0, 2_000) ??
        (status === 'empty' ? 'Fonte sem texto selecionável' : null),
      chunks,
      now: this.clock(),
    })
    return { ...result, status }
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
    accountId: string
    privileged: boolean
    query: string
    limit?: number
  }): Promise<ZappyKnowledgeHit[]> {
    const courses = await this.listMyCourses.execute(
      input.userId,
      input.privileged,
      'kids',
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
    return this.repository.search(lessonIds, normalizeZappyText(input.query), input.limit ?? 5)
  }

  /** Indexa texto rico e devolve os downloads externos que o admin precisa extrair. */
  async backfill(): Promise<{ indexed: number; pending: ZappyKnowledgePendingExtraction[] }> {
    const blocks = await this.repository.listPublishedKidsBlocks()
    let indexed = 0
    const pending: ZappyKnowledgePendingExtraction[] = []
    for (const block of blocks) {
      const sourceRef = `block:${block.blockId}`
      if (block.content.kind === 'rich_text') {
        await this.sync({
          courseId: block.courseId,
          lessonId: block.lessonId,
          sourceType: 'rich-text',
          sourceRef,
          content: block.content.markdown ?? block.content.html ?? '',
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
            location,
          })
        }
      } else if (block.content.kind === 'ebook' && block.content.zappyStudentNotebook) {
        pending.push({
          courseId: block.courseId,
          lessonId: block.lessonId,
          sourceType: 'student-notebook',
          sourceRef,
          location: block.content.url,
        })
      }
    }
    return { indexed, pending }
  }

  report(): Promise<ZappyKnowledgeReport> {
    return this.repository.report()
  }
}
