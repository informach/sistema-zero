import { describe, expect, it } from 'bun:test'
import { investigationWindowFor, perfWindowFor } from '../../state/devtools'
import { readZappyObservation } from './zappyObservation'

/**
 * Lote 5 da missão (seção 15, 21/11/2026): o Zappy só recebe o que a aba que a criança LIGOU
 * mostra, lido na hora da pergunta.
 */
const slice = (fps: number, sprites: number | null = 12) => ({
  fps,
  frameMsAvg: 1000 / Math.max(1, fps),
  frameMsMax: fps < 30 ? 90 : 18,
  sprites,
  objects: null,
  draws: null,
  canvas: true,
})

describe('readZappyObservation', () => {
  it('com as abas desligadas, nada sai, mesmo com dados guardados', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive({
        frame: 3,
        paused: false,
        canPause: true,
        pauseLater: false,
        values: [{ name: 'pontos', text: '7' }],
        error: null,
      })
    perfWindowFor(ui).getState().push(slice(60))
    expect(readZappyObservation(ui, { measuring: false, investigating: false })).toEqual({})
  })

  it('a aba Investigar ligada manda os valores e o quadro de agora', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive({
        frame: 41,
        paused: true,
        canPause: true,
        pauseLater: false,
        values: [{ name: 'pontos', text: '7' }],
        error: null,
      })
    expect(readZappyObservation(ui, { measuring: false, investigating: true })).toEqual({
      investigation: { frame: 41, paused: true, values: [{ name: 'pontos', text: '7' }] },
    })
  })

  it('a aba Desempenho ligada manda o resumo dos cartões', () => {
    const ui = {}
    const window = perfWindowFor(ui).getState()
    for (const fps of [60, 58, 20, 22, 59, 18]) window.push(slice(fps, 300))
    expect(readZappyObservation(ui, { measuring: true, investigating: false })).toEqual({
      performance: {
        seconds: 3,
        fpsNow: 18,
        fpsMin: 18,
        slowEpisodes: 2,
        slowestFrameMs: 90,
        sprites: 300,
        objects: null,
        draws: null,
      },
    })
  })

  it('a medida recusada ou ainda vazia não vira número', () => {
    const ui = {}
    expect(readZappyObservation(ui, { measuring: true, investigating: true })).toEqual({})
    perfWindowFor(ui).getState().refuse()
    expect(readZappyObservation(ui, { measuring: true, investigating: false })).toEqual({})
  })
})
