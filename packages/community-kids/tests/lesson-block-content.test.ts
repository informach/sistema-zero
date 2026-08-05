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
