import { describe, expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  type LessonDraftDocument,
} from '@sistemazero/core/learning'
import { planEbookMaterialUpload } from '../src/lib/lesson-ebook-material'
import type { LessonBlockContent } from '../src/lib/types'

const pdf = (filename: string, url: string) => ({
  filename,
  url,
  fileType: 'application/pdf',
  sizeBytes: 1024,
})

function document(): LessonDraftDocument<LessonBlockContent> {
  return {
    title: 'Aula',
    slug: 'aula',
    estimatedMinutes: null,
    attachments: [],
    plannedVideos: [],
    blocks: [],
    sections: [defaultLessonSection('s1', 'Parte 1', [])],
  }
}

const ebookBlock = (url: string) => ({
  id: 'ebook-1',
  content: { kind: 'ebook' as const, url, title: 'Caderno do Dino' },
})

function upload(
  initial: LessonDraftDocument<LessonBlockContent>,
  filename: string,
  url: string,
  previousUrl?: string,
) {
  let next = initial
  let counter = 0
  const changes = planEbookMaterialUpload(initial, {
    ebookBlock: ebookBlock(url),
    sectionId: 's1',
    previousUrl,
    file: pdf(filename, url),
    createId: () => `new-${++counter}`,
  })
  for (const change of changes) next = applyLessonDraftChange(next, change)
  return next
}

describe('PDF do livro 3D como material complementar', () => {
  test('cria anexo privado e bloco de materiais na mesma seção, depois do livro', () => {
    const next = upload(document(), 'caderno.pdf', 'r2priv:caderno.pdf')
    expect(next.attachments).toEqual([
      {
        id: 'new-1',
        label: 'caderno',
        url: 'r2priv:caderno.pdf',
        fileType: 'application/pdf',
        sizeBytes: 1024,
      },
    ])
    expect(next.sections[0]?.blockIds).toEqual(['ebook-1', 'new-3'])
    expect(next.blocks[1]?.content).toEqual({
      kind: 'materials',
      title: 'Materiais da aula',
      items: [{ id: 'new-2', kind: 'file', attachmentId: 'new-1' }],
    })
  })

  test('trocar o PDF preserva anexo, item e posição, sem material duplicado', () => {
    const first = upload(document(), 'primeiro.pdf', 'r2priv:primeiro.pdf')
    const next = upload(first, 'segundo.pdf', 'r2priv:segundo.pdf', 'r2priv:primeiro.pdf')
    expect(next.attachments).toHaveLength(1)
    expect(next.attachments[0]).toMatchObject({ id: 'new-1', url: 'r2priv:segundo.pdf' })
    expect(next.sections[0]?.blockIds).toEqual(first.sections[0]?.blockIds)
    expect(next.blocks[1]?.content).toEqual(first.blocks[1]?.content)
  })

  test('reaproveita um bloco de materiais existente e não duplica ao reenviar o mesmo PDF', () => {
    const initial = document()
    initial.blocks.push({
      id: 'materials-1',
      content: { kind: 'materials', title: 'Leituras', items: [] },
    })
    initial.sections[0]!.blockIds.push('materials-1')
    const first = upload(initial, 'caderno.pdf', 'r2priv:caderno.pdf')
    const next = upload(first, 'caderno.pdf', 'r2priv:caderno.pdf', 'r2priv:caderno.pdf')
    expect(next.blocks).toHaveLength(2)
    expect(next.attachments).toHaveLength(1)
    expect(next.blocks[0]?.content).toMatchObject({
      kind: 'materials',
      items: [{ kind: 'file', attachmentId: 'new-1' }],
    })
  })
})
