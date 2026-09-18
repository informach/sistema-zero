import { describe, expect, test } from 'bun:test'
import type { LessonDraftDocument, LessonSection } from '@sistemazero/core/learning'
import { compararComOPublicado } from '../src/lib/lesson-published-diff'
import type { LessonBlockContent } from '../src/lib/types'

type Document = LessonDraftDocument<LessonBlockContent>

const secao = (id: string, title: string, blockIds: string[]): LessonSection => ({
  id,
  title,
  objective: '',
  intent: 'exploration',
  blockIds,
  workspaceBlockId: null,
  externalTool: null,
  pendingMedia: [],
})

const texto = (id: string, markdown: string) => ({
  id,
  content: { kind: 'rich_text', markdown } as LessonBlockContent,
})

const doc = (over: Partial<Document> = {}): Document => ({
  title: 'Aula',
  slug: 'aula',
  estimatedMinutes: 10,
  blocks: [],
  sections: [],
  supportBlockIds: [],
  attachments: [],
  plannedVideos: [],
  ...over,
})

const publicado = doc({
  blocks: [texto('b1', 'O que é uma variável'), texto('b2', 'Resumo da aula')],
  sections: [secao('s1', 'Descobrir', ['b1']), secao('s2', 'Fechar', ['b2'])],
  attachments: [{ id: 'a1', label: 'Slides', url: 'r2priv:x', fileType: 'pdf', sizeBytes: 1 }],
})

describe('comparar o rascunho com a versão publicada', () => {
  test('⭐ o que sumiu aparece com a seção de onde saiu', () => {
    const rascunho = doc({
      blocks: [texto('b2', 'Resumo da aula')],
      sections: [secao('s1', 'Descobrir', []), secao('s2', 'Fechar', ['b2'])],
      attachments: publicado.attachments,
    })
    const { sumiram, soNoRascunho, mudaram } = compararComOPublicado(rascunho, publicado)
    expect(sumiram).toHaveLength(1)
    expect(sumiram[0]).toMatchObject({
      id: 'b1',
      tipo: 'bloco',
      titulo: 'O que é uma variável',
      origem: 'Descobrir',
      origemSumiu: false,
    })
    expect(soNoRascunho).toEqual([])
    expect(mudaram).toEqual([])
  })

  test('⚠️ avisa quando a seção de origem não existe mais no rascunho', () => {
    const rascunho = doc({ sections: [secao('s2', 'Fechar', [])] })
    const { sumiram } = compararComOPublicado(rascunho, publicado)
    expect(sumiram.find((p) => p.id === 'b1')?.origemSumiu).toBe(true)
  })

  test('o que ela escreveu depois entra em "só no rascunho"', () => {
    const rascunho = doc({
      blocks: [...publicado.blocks, texto('novo', 'escrito depois')],
      sections: [secao('s1', 'Descobrir', ['b1']), secao('s2', 'Fechar', ['b2', 'novo'])],
      attachments: publicado.attachments,
    })
    const { soNoRascunho, sumiram } = compararComOPublicado(rascunho, publicado)
    expect(soNoRascunho.map((p) => p.id)).toEqual(['novo'])
    expect(sumiram).toEqual([])
  })

  test('bloco editado entra em "mudaram" — e a ordem das chaves não conta', () => {
    const rascunho = doc({
      blocks: [
        { id: 'b1', content: { markdown: 'O que é uma variável', kind: 'rich_text' } as never },
        texto('b2', 'Resumo REESCRITO'),
      ],
      sections: publicado.sections,
      attachments: publicado.attachments,
    })
    const { mudaram } = compararComOPublicado(rascunho, publicado)
    expect(mudaram.map((p) => p.id)).toEqual(['b2'])
  })

  test('chave com `undefined` não conta como mudança', () => {
    const rascunho = doc({
      blocks: [
        {
          id: 'b1',
          content: {
            kind: 'rich_text',
            markdown: 'O que é uma variável',
            capa: undefined,
          } as never,
        },
        texto('b2', 'Resumo da aula'),
      ],
      sections: publicado.sections,
      attachments: publicado.attachments,
    })
    expect(compararComOPublicado(rascunho, publicado).mudaram).toEqual([])
  })

  test('o material apagado também é oferecido de volta', () => {
    const rascunho = doc({ blocks: publicado.blocks, sections: publicado.sections })
    const { sumiram } = compararComOPublicado(rascunho, publicado)
    expect(sumiram).toEqual([
      { id: 'a1', tipo: 'material', titulo: 'Slides', origem: null, origemSumiu: false },
    ])
  })

  test('aula que nunca foi publicada não tem nada a trazer de volta', () => {
    const { semPublicado, sumiram } = compararComOPublicado(
      doc({ blocks: [texto('x', 'a')] }),
      doc(),
    )
    expect(semPublicado).toBe(true)
    expect(sumiram).toEqual([])
  })
})
