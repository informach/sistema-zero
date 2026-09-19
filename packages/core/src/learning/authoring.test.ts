import { describe, expect, it } from 'bun:test'
import { applyLessonDraftChange, type LessonDraftDocument, restoreFromPublished } from './authoring'
import type { LessonSection } from './index'

const secao = (
  id: string,
  blockIds: string[],
  extra: Partial<LessonSection> = {},
): LessonSection => ({
  id,
  title: id,
  objective: '',
  intent: 'exploration',
  blockIds,
  workspaceBlockId: null,
  externalTool: null,
  pendingMedia: [],
  ...extra,
})

const bloco = (id: string, kind = 'rich_text', extra: Record<string, unknown> = {}) => ({
  id,
  content: { kind, ...extra },
})

const doc = (over: Partial<LessonDraftDocument> = {}): LessonDraftDocument => ({
  title: 'Aula 1',
  slug: 'aula-1',
  estimatedMinutes: 10,
  blocks: [],
  sections: [],
  attachments: [],
  plannedVideos: [],
  ...over,
})

/** O publicado: duas seções e um anexo. */
const publicado = doc({
  blocks: [bloco('b1'), bloco('b2', 'video'), bloco('b3')],
  sections: [secao('s1', ['b1']), secao('s2', ['b2', 'b3'])],
  attachments: [{ id: 'a1', label: 'Slides', url: 'r2priv:x', fileType: 'pdf', sizeBytes: 10 }],
})

describe('todo bloco pertence a UMA seção', () => {
  const base = doc({
    blocks: [bloco('b1')],
    sections: [secao('s1', ['b1']), secao('s2', [])],
  })

  it('o bloco novo entra na seção pedida', () => {
    const depois = applyLessonDraftChange(base, {
      type: 'block',
      block: bloco('novo'),
      sectionId: 's1',
    })
    expect(depois.sections.map((s) => s.blockIds)).toEqual([['b1', 'novo'], []])
  })

  it('⚠️ sem seção (ou com uma que sumiu) ele cai no fim da ÚLTIMA, nunca órfão', () => {
    // O órfão é o estado que este caso existe para impedir: um bloco em `blocks` fora de toda
    // seção faz `validateLessonSections` recusar a AULA INTEIRA na gravação, e a autora só
    // descobre na hora de publicar, sem saber qual bloco é.
    for (const sectionId of [undefined, null, 'seção-que-sumiu']) {
      const depois = applyLessonDraftChange(base, {
        type: 'block',
        block: bloco('novo'),
        sectionId,
      })
      expect(depois.sections.map((s) => s.blockIds)).toEqual([['b1'], ['novo']])
      expect(depois.blocks.map((b) => b.id)).toEqual(['b1', 'novo'])
    }
  })

  it('editar um bloco que já existe não o move de seção', () => {
    const depois = applyLessonDraftChange(base, {
      type: 'block',
      block: bloco('b1', 'rich_text', { markdown: 'editei' }),
      sectionId: 's2',
    })
    expect(depois.sections.map((s) => s.blockIds)).toEqual([['b1'], []])
    expect(depois.blocks).toHaveLength(1)
  })

  it('apagar tira o bloco da seção e do documento', () => {
    const depois = applyLessonDraftChange(base, { type: 'remove-block', blockId: 'b1' })
    expect(depois.blocks).toEqual([])
    expect(depois.sections.map((s) => s.blockIds)).toEqual([[], []])
  })
})

describe('restoreFromPublished — trazer a versão publicada de volta', () => {
  it('"tudo" devolve o publicado inteiro, e não a mesma referência', () => {
    const rascunho = doc({ blocks: [bloco('novo')], sections: [secao('s9', ['novo'])] })
    const volta = restoreFromPublished(rascunho, publicado, 'all')
    expect(volta).toEqual(publicado)
    expect(volta.blocks).not.toBe(publicado.blocks)
    expect(volta.blocks[0]).not.toBe(publicado.blocks[0])
  })

  it('⭐ o bloco apagado volta para a seção e a POSIÇÃO de onde saiu', () => {
    // O caso real: ela apagou o b2 do meio da seção 2 e o resto do rascunho seguiu em frente.
    const rascunho = doc({
      blocks: [bloco('b1'), bloco('b3'), bloco('novo')],
      sections: [secao('s1', ['b1']), secao('s2', ['b3', 'novo'])],
    })
    const volta = restoreFromPublished(rascunho, publicado, ['b2'])
    expect(volta.sections[1]?.blockIds).toEqual(['b2', 'b3', 'novo'])
    expect(volta.blocks.map((b) => b.id).sort()).toEqual(['b1', 'b2', 'b3', 'novo'])
  })

  it('⭐ o que a autora criou depois NÃO é tocado', () => {
    const rascunho = doc({
      blocks: [bloco('novo')],
      sections: [secao('s2', ['novo'])],
      attachments: [{ id: 'a9', label: 'Meu', url: 'http://x', fileType: null, sizeBytes: null }],
    })
    const volta = restoreFromPublished(rascunho, publicado, ['b2'])
    expect(volta.blocks.some((b) => b.id === 'novo')).toBe(true)
    expect(volta.attachments).toEqual(rascunho.attachments)
    expect(volta.title).toBe('Aula 1')
  })

  it('seção que sumiu do rascunho → o bloco volta para o fim da ÚLTIMA', () => {
    // ⚠️ Não existe mais lugar fora das seções: o bloco precisa pousar em alguma, e a última é a
    // única escolha que não inventa posição. Ele NÃO pode ficar órfão em `blocks` (a gravação
    // recusaria a aula inteira) nem sumir.
    const rascunho = doc({
      blocks: [bloco('b1'), bloco('z')],
      sections: [secao('s1', ['b1']), secao('s9', ['z'])],
    })
    const volta = restoreFromPublished(rascunho, publicado, ['b2'])
    expect(volta.sections.map((s) => s.blockIds)).toEqual([['b1'], ['z', 'b2']])
    expect(volta.blocks.map((b) => b.id).sort()).toEqual(['b1', 'b2', 'z'])
  })

  it('bloco que AINDA existe no rascunho só tem o conteúdo trocado, e não sai do lugar', () => {
    const rascunho = doc({
      blocks: [bloco('b3', 'rich_text', { markdown: 'editei' }), bloco('b1')],
      sections: [secao('s2', ['b3']), secao('s1', ['b1'])],
    })
    const volta = restoreFromPublished(rascunho, publicado, ['b3'])
    expect(volta.blocks[0]).toEqual(bloco('b3'))
    expect(volta.sections).toEqual(rascunho.sections)
  })

  it('o vínculo da seção volta só quando o rascunho não tem um', () => {
    const comVinculos = doc({
      blocks: [bloco('b1'), bloco('b2', 'video')],
      sections: [
        secao('s1', ['b1']),
        secao('s2', ['b2'], {
          workspaceBlockId: 'b2',
          completion: { version: 1, blockIds: ['b2'] },
        }),
      ],
    })
    const vazio = doc({
      blocks: [],
      sections: [secao('s2', [], { completion: { version: 1, blockIds: [] } })],
    })
    expect(restoreFromPublished(vazio, comVinculos, ['b2']).sections[0]).toMatchObject({
      workspaceBlockId: 'b2',
      completion: { blockIds: ['b2'] },
    })

    const jaEscrito = doc({
      blocks: [bloco('outro')],
      sections: [
        secao('s2', ['outro'], {
          workspaceBlockId: 'outro',
          completion: { version: 1, blockIds: ['outro'] },
        }),
      ],
    })
    expect(restoreFromPublished(jaEscrito, comVinculos, ['b2']).sections[0]).toMatchObject({
      workspaceBlockId: 'outro',
      completion: { blockIds: ['outro'] },
    })
  })

  it('⚠️ o planejado do rascunho SAI quando o bloco restaurado não é mais vídeo', () => {
    // Senão o documento inteiro seria recusado na gravação: um vídeo planejado tem de apontar
    // para um bloco de vídeo. O defeito só aparecia com a autora trocando o tipo do bloco.
    const rascunho = doc({
      blocks: [bloco('b1', 'video', { provider: 'vimeo', src: '' })],
      sections: [secao('s1', ['b1'])],
      plannedVideos: [{ blockId: 'b1', instructions: 'grave a abertura', videoId: null }],
    })
    const noAr = doc({
      blocks: [bloco('b1', 'rich_text', { markdown: 'virou texto' })],
      sections: [secao('s1', ['b1'])],
    })
    const volta = restoreFromPublished(rascunho, noAr, ['b1'])
    expect(volta.blocks[0]?.content.kind).toBe('rich_text')
    expect(volta.plannedVideos).toEqual([])
  })

  it('o planejado de OUTRO bloco não é tocado pela restauração', () => {
    const rascunho = doc({
      blocks: [bloco('b1'), bloco('outro', 'video', { provider: 'vimeo', src: '' })],
      sections: [secao('s1', ['b1', 'outro'])],
      plannedVideos: [{ blockId: 'outro', instructions: 'grave o fim', videoId: null }],
    })
    const noAr = doc({
      blocks: [bloco('b1', 'rich_text', { markdown: 'no ar' })],
      sections: [secao('s1', ['b1'])],
    })
    expect(restoreFromPublished(rascunho, noAr, ['b1']).plannedVideos).toEqual(
      rascunho.plannedVideos,
    )
  })

  it('o vídeo planejado acompanha o bloco dele', () => {
    const comPlano = doc({
      blocks: [bloco('b2', 'video')],
      sections: [secao('s2', ['b2'])],
      plannedVideos: [{ blockId: 'b2', instructions: 'grave a abertura', videoId: null }],
    })
    const volta = restoreFromPublished(doc({ sections: [secao('s2', [])] }), comPlano, ['b2'])
    expect(volta.plannedVideos).toEqual(comPlano.plannedVideos)
  })

  it('o material apagado também volta, na posição do publicado', () => {
    const rascunho = doc({
      attachments: [{ id: 'a9', label: 'Meu', url: 'http://x', fileType: null, sizeBytes: null }],
    })
    const volta = restoreFromPublished(rascunho, publicado, ['a1'])
    expect(volta.attachments.map((a) => a.id)).toEqual(['a1', 'a9'])
  })

  it('id que não existe no publicado é ignorado, e lista vazia é no-op', () => {
    const rascunho = doc({ blocks: [bloco('novo')], sections: [secao('s9', ['novo'])] })
    expect(restoreFromPublished(rascunho, publicado, ['fantasma'])).toEqual(rascunho)
    expect(restoreFromPublished(rascunho, publicado, [])).toBe(rascunho)
  })
})
