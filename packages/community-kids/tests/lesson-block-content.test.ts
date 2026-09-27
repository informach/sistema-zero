import { describe, expect, it } from 'bun:test'
import { parseLessonBlock } from '../src/lib/lesson-block-content'

describe('validação de conteúdo dos blocos de aula', () => {
  it('aceita um bloco válido e preserva o narrowing pelo kind', () => {
    const parsed = parseLessonBlock({
      id: 'video-1',
      kind: 'video',
      sortOrder: 1,
      content: { kind: 'video', provider: 'youtube', src: 'https://youtu.be/abcdef' },
    })

    expect(parsed?.content.kind).toBe('video')
    if (parsed?.content.kind !== 'video') throw new Error('bloco de vídeo não foi refinado')
    expect(parsed.content.provider).toBe('youtube')
  })

  it('aceita o bloco "em breve" com e sem recado, e recusa recado não-textual', () => {
    // Sem `message` o renderizador usa o recado padrão da plataforma.
    const semRecado = parseLessonBlock({
      id: 'cs-1',
      kind: 'coming_soon',
      sortOrder: 0,
      content: { kind: 'coming_soon' },
    })
    expect(semRecado?.content.kind).toBe('coming_soon')

    const comRecado = parseLessonBlock({
      id: 'cs-2',
      kind: 'coming_soon',
      sortOrder: 0,
      content: { kind: 'coming_soon', message: 'Chega semana que vem!' },
    })
    if (comRecado?.content.kind !== 'coming_soon') throw new Error('bloco não foi refinado')
    expect(comRecado.content.message).toBe('Chega semana que vem!')

    // Payload malformado some (fail-closed) em vez de renderizar lixo p/ a criança.
    // Numa aula "em breve" este é o ÚNICO bloco servido, então cair aqui deixa a aula
    // sem conteúdo nenhum (o botão travado e a frase abaixo dele sobrevivem, porque
    // leem `b.kind` cru e não o conteúdo parseado). O DTO do members recusa `message`
    // não-string na API; o guard é a rede para dado legado/escrita direta no banco.
    for (const message of [42, null, {}, ['a']]) {
      expect(
        parseLessonBlock({
          id: 'cs-3',
          kind: 'coming_soon',
          sortOrder: 0,
          content: { kind: 'coming_soon', message },
        }),
      ).toBeNull()
    }
  })

  it('⚠️⚠️ o bloco de MATERIAIS atravessa o parser (sem `case`, ele some da aula em silêncio)', () => {
    // O anti-vácuo deste arquivo: o `default` devolve `null` e o bloco desaparece sem erro
    // nenhum — nem no console, nem em teste de comportamento, nem no typecheck.
    const parsed = parseLessonBlock({
      id: 'mat-1',
      kind: 'materials',
      sortOrder: 0,
      content: {
        kind: 'materials',
        title: 'Arquivos do Pinta',
        items: [
          { id: 'i1', kind: 'file', attachmentId: 'a1' },
          { id: 'i2', kind: 'link', url: 'https://exemplo.com', label: 'Paleta' },
        ],
      },
    })
    expect(parsed?.content.kind).toBe('materials')
    if (parsed?.content.kind === 'materials') expect(parsed.content.items).toHaveLength(2)
  })

  it('item torto é DESCARTADO, e a lista que fica vazia derruba o bloco', () => {
    // Um material a menos é melhor que a lista inteira sumindo; mas um bloco sem nenhum item
    // válido não tem o que mostrar, e desenhar a moldura vazia seria pior.
    const comLixo = parseLessonBlock({
      id: 'mat-2',
      kind: 'materials',
      sortOrder: 0,
      content: {
        kind: 'materials',
        items: [
          { id: 'i1', kind: 'file', attachmentId: 'a1' },
          { id: 'i2', kind: 'file' },
          { kind: 'text', markdown: 'sem id' },
          { id: 'i4', kind: 'inventado', url: 'https://x' },
        ],
      },
    })
    expect(comLixo?.content.kind === 'materials' && comLixo.content.items.map((i) => i.id)).toEqual(
      ['i1'],
    )
    expect(
      parseLessonBlock({
        id: 'mat-3',
        kind: 'materials',
        sortOrder: 0,
        content: { kind: 'materials', items: [{ id: 'i1', kind: 'file' }] },
      }),
    ).toBeNull()
  })

  it('recusa kind divergente e payload incompleto na fronteira', () => {
    expect(
      parseLessonBlock({
        id: 'bad-1',
        kind: 'video',
        sortOrder: 1,
        content: { kind: 'audio', url: '/audio.mp3' },
      }),
    ).toBeNull()
    expect(
      parseLessonBlock({
        id: 'bad-2',
        kind: 'quiz',
        sortOrder: 2,
        content: { kind: 'quiz', questions: [{ id: 'q1' }] },
      }),
    ).toBeNull()
  })
})
