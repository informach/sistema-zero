import { describe, expect, test } from 'bun:test'
import { type LessonLearningProgress, videoCoverageAnswers } from '@sistemazero/core/learning'
import { createEmptyProject } from '@sistemazero/studio/project'
import { type GateBlock, isPlayableVideo, videoGateFor } from '../src/lib/video-gate'

/**
 * "Assistir ao vídeo antes da atividade" (03/10/2026): quando a atividade da direita tranca.
 * O caso real é o Cadê Todo Mundo?: vídeo à esquerda, jogo pronto à direita, e a criança que
 * ampliou o jogo antes de entender o que fazer.
 */

const video: GateBlock = {
  id: 'video',
  kind: 'video',
  content: { kind: 'video', provider: 'vimeo', src: 'https://player.vimeo.com/video/123456' },
  blockRevision: 'r1',
}
const estudio: GateBlock = { id: 'estudio', kind: 'studio', content: { kind: 'studio' } }
const texto: GateBlock = { id: 'fala', kind: 'dialogue', content: { kind: 'dialogue', text: 'Oi' } }
const cena: GateBlock = {
  id: 'cena',
  kind: 'interactive',
  content: {
    kind: 'interactive',
    title: 'O salto',
    instructions: 'Mexa no impulso.',
    hints: [],
    required: false,
    activity: { type: 'experimentation', scene: 'impulse' },
  },
}
const livro: GateBlock = {
  id: 'livro',
  kind: 'materials',
  content: { kind: 'materials', bookPreview: true, items: [] },
}

function assistido(fracao: number, revision = 'r1'): LessonLearningProgress {
  return {
    sectionId: null,
    blocks: [
      {
        blockId: 'video',
        revision,
        answers: videoCoverageAnswers({ duration: 100, ranges: [[0, fracao * 100]] }),
        hintsUsed: 0,
        attemptsCount: 0,
        result: null,
        positionSeconds: null,
        updatedAt: '2026-10-03T12:00:00.000Z',
      },
    ],
  }
}

const base = { enabled: true, sectionCompleted: false, learningProgress: undefined }

describe('a tranca da atividade', () => {
  test('vídeo não visto + experiência na direita = trancada, apontando o vídeo', () => {
    const gate = videoGateFor({ ...base, blocks: [texto, video, cena] })
    expect(gate).toEqual({ locked: true, videoBlockId: 'video', watchedFraction: 0 })
  })

  test('o Estúdio e o Pinta não trancam: a criança monta junto com o vídeo (06/10/2026)', () => {
    expect(videoGateFor({ ...base, blocks: [texto, video, estudio] }).locked).toBe(false)
    const pinta: GateBlock = { id: 'pinta', kind: 'pinta', content: { kind: 'pinta' } }
    expect(videoGateFor({ ...base, blocks: [video, pinta] }).locked).toBe(false)
    // Com uma experiência na mesma seção, a tranca volta: ela pede o vídeo antes.
    expect(videoGateFor({ ...base, blocks: [video, estudio, cena] }).locked).toBe(true)
  })

  test('a cena também é atividade', () => {
    expect(videoGateFor({ ...base, blocks: [video, cena] }).locked).toBe(true)
  })

  test('abre aos 90% assistidos, e conta o que foi visto', () => {
    const quase = videoGateFor({
      ...base,
      blocks: [video, cena],
      learningProgress: assistido(0.45),
    })
    expect(quase.locked).toBe(true)
    expect(quase.watchedFraction).toBeCloseTo(0.45)
    const visto = videoGateFor({
      ...base,
      blocks: [video, cena],
      learningProgress: assistido(0.9),
    })
    expect(visto.locked).toBe(false)
    expect(visto.videoBlockId).toBe('video')
  })

  test('o vídeo trocado pela autora (outra revisão) tranca de novo', () => {
    const gate = videoGateFor({
      ...base,
      blocks: [video, cena],
      learningProgress: assistido(1, 'revisao-antiga'),
    })
    expect(gate.locked).toBe(true)
  })

  test('a opção desligada, ou sem player, nunca tranca', () => {
    expect(videoGateFor({ ...base, enabled: false, blocks: [video, cena] }).locked).toBe(false)
  })

  test('seção já concluída não tranca ao revisitar', () => {
    expect(videoGateFor({ ...base, sectionCompleted: true, blocks: [video, cena] }).locked).toBe(
      false,
    )
  })

  test('sem ferramenta na direita não há o que trancar', () => {
    expect(videoGateFor({ ...base, blocks: [texto, video] })).toEqual({
      locked: false,
      videoBlockId: null,
      watchedFraction: 0,
    })
  })

  test('a prévia de livro mora na direita, mas não é atividade', () => {
    expect(videoGateFor({ ...base, blocks: [video, livro] }).locked).toBe(false)
  })

  test('o jogo pronto tranca, como a experiência: o vídeo mostra como se joga', () => {
    const jogoPronto: GateBlock = {
      id: 'jogo',
      kind: 'interactive',
      content: {
        kind: 'interactive',
        title: 'Jogue o jogo pronto',
        instructions: 'Encontre os três personagens.',
        hints: [],
        required: true,
        activity: {
          type: 'project-play',
          completion: 'participation',
          project: createEmptyProject('jardim', 'Jardim pronto'),
          stage: { width: 640, height: 360 },
          targets: [],
        },
      },
    }
    expect(videoGateFor({ ...base, blocks: [video, jogoPronto] }).locked).toBe(true)
  })

  test('sem vídeo acompanhável (sem revisão) nada tranca: a tranca nunca abriria', () => {
    const semRevisao: GateBlock = { ...video, blockRevision: undefined }
    expect(videoGateFor({ ...base, blocks: [semRevisao, cena] }).locked).toBe(false)
  })

  test('vale o PRIMEIRO vídeo da seção', () => {
    const segundo: GateBlock = { ...video, id: 'video-2', blockRevision: 'r9' }
    const gate = videoGateFor({ ...base, blocks: [video, segundo, cena] })
    expect(gate.videoBlockId).toBe('video')
  })

  test('⚠️ vídeo SEM player (sem link, link ilegível) não conta: trancaria para sempre', () => {
    const quebrado: GateBlock = {
      ...video,
      id: 'quebrado',
      content: { kind: 'video', provider: 'youtube', src: 'https://exemplo.com/nada' },
    }
    const bom: GateBlock = { ...video, id: 'bom' }
    expect(videoGateFor({ ...base, blocks: [quebrado, bom, cena] }).videoBlockId).toBe('bom')
    expect(videoGateFor({ ...base, blocks: [quebrado, cena] }).locked).toBe(false)
  })

  test('o que o player mediu abre a tranca antes (e sem) a confirmação do servidor', () => {
    const gate = videoGateFor({
      ...base,
      blocks: [video, cena],
      learningProgress: assistido(0.3),
      localWatched: { video: { revision: 'r1', fraction: 0.92 } },
    })
    expect(gate.locked).toBe(false)
    expect(gate.watchedFraction).toBeCloseTo(0.92)
    // A medida de um vídeo que a autora já trocou não vale.
    expect(
      videoGateFor({
        ...base,
        blocks: [video, cena],
        localWatched: { video: { revision: 'antiga', fraction: 1 } },
      }).locked,
    ).toBe(true)
  })
})

describe('o vídeo que tem player', () => {
  test('o mesmo critério do LessonVideo', () => {
    const v = (content: unknown) => isPlayableVideo({ kind: 'video', content })
    expect(v({ provider: 'vimeo', src: 'https://player.vimeo.com/video/123456' })).toBe(true)
    expect(v({ provider: 'youtube', src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(
      true,
    )
    expect(v({ provider: 'file', src: '/video.webm' })).toBe(true)
    expect(v({ provider: 'vimeo', src: 'https://vimeo.example/nada' })).toBe(false)
    expect(v({ provider: 'file', src: '' })).toBe(false)
    expect(isPlayableVideo({ kind: 'image', content: { src: '/a.png' } })).toBe(false)
  })
})
