import { describe, expect, test } from 'bun:test'
import { previewLessonOf } from '../src/app/admin/professor/ao-vivo/[id]/teacher-live-room'

/**
 * A sala da professora monta a aula do encontro a partir do documento PUBLICADO (cursos ao vivo,
 * 14/10/2026). O espelho precisa sair no formato que o `LessonSections` desenha, com as partes e
 * as anotações dela, e com o arquivo dos materiais resolvido sem levar o `url` do anexo.
 */
describe('a aula publicada na sala da professora', () => {
  test('blocos na ordem, partes com as anotações e materiais com nome, sem o endereço', () => {
    const lesson = previewLessonOf('lesson-1', {
      title: 'Encontro 1',
      slug: 'encontro-1',
      estimatedMinutes: 60,
      plannedVideos: [],
      attachments: [
        {
          id: 'anexo',
          label: 'Folha de sprites',
          url: 'r2priv:segredo',
          fileType: 'application/pdf',
          sizeBytes: 2048,
        },
      ],
      blocks: [
        { id: 'texto', content: { kind: 'rich_text', markdown: 'Oi' } },
        {
          id: 'materiais',
          content: {
            kind: 'materials',
            items: [
              { kind: 'file', id: 'item', attachmentId: 'anexo' },
              { kind: 'file', id: 'sumiu', attachmentId: 'apagado' },
            ],
          },
        },
      ],
      sections: [
        {
          id: 'a',
          title: 'Conhecer',
          objective: 'Conhecer o jogo',
          intent: 'presentation',
          pendingMedia: [],
          blockIds: ['texto', 'materiais'],
          workspaceBlockId: null,
          externalTool: null,
          teacherNotes: 'Mostrar o bloco de colisão.',
        },
      ],
    })
    expect(lesson.id).toBe('lesson-1')
    expect(lesson.blocks.map((block) => [block.id, block.kind, block.sortOrder])).toEqual([
      ['texto', 'rich_text', 0],
      ['materiais', 'materials', 1],
    ])
    expect((lesson.sections?.[0] as { teacherNotes?: string }).teacherNotes).toBe(
      'Mostrar o bloco de colisão.',
    )
    const items = (lesson.blocks[1]!.content as { items: Record<string, unknown>[] }).items
    expect(items).toEqual([
      {
        kind: 'file',
        id: 'item',
        attachmentId: 'anexo',
        label: 'Folha de sprites',
        fileType: 'application/pdf',
        sizeBytes: 2048,
      },
    ])
    expect(JSON.stringify(lesson)).not.toContain('r2priv')
    expect(lesson.attachments).toEqual([])
  })
})
