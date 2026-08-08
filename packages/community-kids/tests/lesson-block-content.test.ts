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
