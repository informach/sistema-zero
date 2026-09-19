import {
  applyLessonDraftChange,
  type LessonDraftChange,
  type LessonDraftDocument,
} from '@sistemazero/core/learning'
import { type LessonBlockContent, MATERIALS_MAX_ITEMS, type MaterialsBlock } from './types'

type Document = LessonDraftDocument<LessonBlockContent>
type Change = LessonDraftChange<LessonBlockContent>

/** Um upload do livro 3D deve aparecer também como arquivo baixável na aula. */
export function planEbookMaterialUpload(
  document: Document,
  input: {
    ebookBlock: { id: string; content: Extract<LessonBlockContent, { kind: 'ebook' }> }
    sectionId: string | null
    previousUrl?: string
    file: { filename: string; url: string; fileType: string; sizeBytes: number | null }
    createId?: () => string
  },
): Change[] {
  const section =
    document.sections.find((s) => s.id === input.sectionId) ?? document.sections.at(-1)
  if (!section) throw new Error('Crie uma seção antes de adicionar o livro 3D.')

  const createId = input.createId ?? crypto.randomUUID
  const changes: Change[] = []
  let current = document
  const add = (change: Change) => {
    changes.push(change)
    current = applyLessonDraftChange(current, change)
  }

  // A ordem livro → materiais também vale no primeiro upload de um bloco ainda não salvo.
  add({ type: 'block', block: input.ebookBlock, sectionId: section.id })

  const previous = input.previousUrl
    ? current.attachments.find((attachment) => attachment.url === input.previousUrl)
    : undefined
  const alreadyUploaded = current.attachments.find(
    (attachment) => attachment.url === input.file.url,
  )
  const attachmentId = alreadyUploaded?.id ?? previous?.id ?? createId()
  if (!alreadyUploaded) {
    const attachment = {
      id: attachmentId,
      label: input.file.filename.replace(/\.pdf$/i, ''),
      url: input.file.url,
      fileType: input.file.fileType || 'application/pdf',
      sizeBytes: input.file.sizeBytes,
    }
    add({
      type: 'attachments',
      attachments: previous
        ? current.attachments.map((item) => (item.id === previous.id ? attachment : item))
        : [...current.attachments, attachment],
    })
  }

  // Se o PDF anterior já estava nos materiais, a troca mantém o lugar escolhido pela autora.
  const linkedPrevious = current.blocks.find(
    (block) =>
      block.content.kind === 'materials' &&
      block.content.items.some(
        (item) => item.kind === 'file' && item.attachmentId === previous?.id,
      ),
  )
  if (linkedPrevious?.content.kind === 'materials') {
    if (previous?.id === attachmentId) return changes
    add({
      type: 'block',
      block: {
        id: linkedPrevious.id,
        content: {
          ...linkedPrevious.content,
          items: linkedPrevious.content.items.map((item) =>
            item.kind === 'file' && item.attachmentId === previous?.id
              ? { ...item, attachmentId }
              : item,
          ),
        },
      },
    })
    return changes
  }
  if (
    current.blocks.some(
      (block) =>
        block.content.kind === 'materials' &&
        block.content.items.some(
          (item) => item.kind === 'file' && item.attachmentId === attachmentId,
        ),
    )
  )
    return changes

  const item = { id: createId(), kind: 'file' as const, attachmentId }
  const materials = current.blocks.find(
    (block) =>
      section.blockIds.includes(block.id) &&
      block.content.kind === 'materials' &&
      block.content.items.length < MATERIALS_MAX_ITEMS,
  )
  if (materials?.content.kind === 'materials') {
    add({
      type: 'block',
      block: {
        id: materials.id,
        content: { ...materials.content, items: [...materials.content.items, item] },
      },
    })
  } else {
    const content: MaterialsBlock = {
      kind: 'materials',
      title: 'Materiais da aula',
      items: [item],
    }
    add({ type: 'block', block: { id: createId(), content }, sectionId: section.id })
  }
  return changes
}
