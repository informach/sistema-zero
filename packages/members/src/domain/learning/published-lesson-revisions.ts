import { createHash } from 'node:crypto'
import { stableJson } from '../shared/stable-json'

interface RevisionLesson {
  title: unknown
  slug: unknown
  estimatedMinutes: unknown
  blocks: readonly { content: unknown }[]
  attachments: readonly { id: unknown; url: unknown; zappyStudentNotebook?: unknown }[]
}

/** Contrato compartilhado pelo autor de aulas e pela migração operacional de documentos. */
export function publishedLessonRevisions(
  lesson: RevisionLesson,
  sections: unknown,
  migration?: { previousSections: unknown; migratedSections: unknown },
): { current: string; compatible: string[] } {
  // A marcação do caderno não altera o arquivo entregue. O Livro 3D continua
  // identificado pela URL lógica para preservar bases anteriores ao attachmentId.
  const attachments = lesson.attachments.map(
    ({ zappyStudentNotebook: _notebook, ...attachment }) => attachment,
  )
  const revision = (sectionValue: unknown, includeNotebook: boolean) => {
    const blocks = lesson.blocks.map((block) => {
      const content = block.content
      if (
        !content ||
        typeof content !== 'object' ||
        !('kind' in content) ||
        content.kind !== 'ebook' ||
        !('attachmentId' in content)
      )
        return block
      const attachment = lesson.attachments.find((item) => item.id === content.attachmentId)
      if (!attachment) return block
      return {
        ...block,
        content: {
          kind: 'ebook',
          url: attachment.url,
          ...('title' in content && content.title ? { title: content.title } : {}),
          ...(includeNotebook && attachment.zappyStudentNotebook
            ? { zappyStudentNotebook: true }
            : {}),
        },
      }
    })
    return createHash('sha256')
      .update(
        stableJson({
          title: lesson.title,
          slug: lesson.slug,
          estimatedMinutes: lesson.estimatedMinutes,
          blocks,
          attachments,
          sections: sectionValue,
        }),
      )
      .digest('hex')
  }
  const previousSections =
    migration && stableJson(sections) === stableJson(migration.migratedSections)
      ? migration.previousSections
      : null
  return {
    current: revision(sections, false),
    compatible: [
      revision(sections, true),
      ...(previousSections
        ? [revision(previousSections, false), revision(previousSections, true)]
        : []),
    ],
  }
}
