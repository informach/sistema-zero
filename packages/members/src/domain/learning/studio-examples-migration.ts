import { createHash } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  convertLegacyStudioSolutionBlocks,
  convertLegacyStudioSolutions,
  type LessonDraftDocument,
  type LessonSection,
  lessonStudioExampleTransportIssues,
  lessonStudioProjectExampleIssues,
} from '@sistemazero/core/learning'
import { blockRevisionFingerprint } from '../course/block-revision'
import type { LessonWithContent } from '../course/course'
import { stableJson } from '../shared/stable-json'
import { publishedLessonRevisions } from './published-lesson-revisions'

interface DraftSnapshot {
  publishedRevision: string
  document: LessonDraftDocument
  previousDocument: LessonDraftDocument | null
}

/** Stable only for this explicit format conversion, independent of StudioProject.id. */
export function migratedStudioExampleId(
  lessonId: string,
  blockId: string,
  solution: unknown,
): string {
  const hash = createHash('sha256')
    .update(`sz-studio-examples-v1:${lessonId}:${blockId}:${stableJson(solution)}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-b${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

/** Pure plan, shared by dry-run/apply. It never relaxes an unexpected authoring baseline. */
export function planStudioExamplesMigration(input: {
  lesson: LessonWithContent
  courseSlug: string
  sections: LessonSection[] | undefined
  draft: DraftSnapshot | null
  criteriaMigration?: { previousSections: unknown; migratedSections: unknown }
}) {
  const { lesson, courseSlug, sections, draft, criteriaMigration } = input
  const convertPublished = convertLegacyStudioSolutionBlocks(
    lesson.blocks,
    sections ?? [],
    (blockId) => {
      const content = lesson.blocks.find((block) => block.id === blockId)?.content
      const solution = content && Object.getOwnPropertyDescriptor(content, 'solutionProject')?.value
      return migratedStudioExampleId(lesson.id, blockId, solution)
    },
  )
  const convertedContent = new Map(
    convertPublished.blocks.map((block) => [block.id, block.content]),
  )
  const publishedBlocks = lesson.blocks.map((block) => ({
    ...block,
    content: convertedContent.get(block.id) ?? block.content,
  }))
  for (const [index, block] of publishedBlocks.entries()) {
    if (
      blockRevisionFingerprint(block.content) !==
      blockRevisionFingerprint(lesson.blocks[index]?.content)
    )
      throw new ValidationError(
        'A conversão tentou alterar conteúdo pedagógico. Nenhuma alteração pode ser aplicada.',
      )
  }
  const convertDocument = (document: LessonDraftDocument | null) => {
    if (!document) return { document: null, converted: [] }
    return convertLegacyStudioSolutions(document, (blockId) => {
      const content = document.blocks.find((block) => block.id === blockId)?.content
      return migratedStudioExampleId(
        lesson.id,
        blockId,
        content && Object.getOwnPropertyDescriptor(content, 'solutionProject')?.value,
      )
    })
  }
  const convertedDraft = convertDocument(draft?.document ?? null)
  const convertedPrevious = convertDocument(draft?.previousDocument ?? null)
  const counts = {
    published: convertPublished.converted.length,
    draft: convertedDraft.converted.length,
    previous: convertedPrevious.converted.length,
  }
  const changed = Object.values(counts).some((count) => count > 0)
  const before = publishedLessonRevisions(lesson, sections, criteriaMigration)
  const after = publishedLessonRevisions(
    { ...lesson, blocks: publishedBlocks },
    sections,
    criteriaMigration,
  )
  const kind: 'current' | 'conflict' | 'convert' = !changed
    ? 'current'
    : draft &&
        draft.publishedRevision !== before.current &&
        !before.compatible.includes(draft.publishedRevision)
      ? 'conflict'
      : 'convert'
  if (changed) {
    const publishedDocument: LessonDraftDocument = {
      title: lesson.title,
      slug: lesson.slug,
      estimatedMinutes: lesson.estimatedMinutes,
      blocks: publishedBlocks.map((block) => ({ id: block.id, content: { ...block.content } })),
      sections: sections ?? [],
      attachments: lesson.attachments,
      plannedVideos: [],
    }
    for (const document of [
      publishedDocument,
      convertedDraft.document,
      convertedPrevious.document,
    ]) {
      if (!document) continue
      const [issue] = lessonStudioProjectExampleIssues(document.sections, document.blocks)
      if (issue) throw new ValidationError(issue.message)
      const [transport] = lessonStudioExampleTransportIssues(document, courseSlug)
      if (transport) throw new ValidationError(transport.message)
    }
  }
  return {
    kind,
    counts,
    beforeRevision: before.current,
    afterRevision: after.current,
    publishedBlocks,
    draftDocument: convertedDraft.document,
    previousDocument: convertedPrevious.document,
    associations: {
      published: convertPublished.converted,
      draft: convertedDraft.converted,
      previous: convertedPrevious.converted,
    },
  }
}
