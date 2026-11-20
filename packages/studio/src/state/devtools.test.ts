import { describe, expect, it } from 'bun:test'
import { summarizePerf } from '../components/devtools/perfSummary'
import {
  createPerfWindow,
  forgetPerfWindow,
  PERF_HISTORY_SLICES,
  type PerfSlice,
  perfWindowFor,
} from './devtools'

const slice = (fps: number, frameMsMax = 1000 / fps): PerfSlice => ({
  fps,
  frameMsAvg: 1000 / fps,
  frameMsMax,
  sprites: 2,
  canvas: true,
})

describe('a janela da medida da aba Desempenho', () => {
  it('guarda só os últimos 30 segundos e um jogo novo limpa as fatias', () => {
    const window = createPerfWindow(1000)
    expect(window.getState().since).toBe(1000)
    for (let i = 0; i < PERF_HISTORY_SLICES + 5; i++) window.getState().push(slice(10 + i))
    const slices = window.getState().slices
    expect(slices).toHaveLength(PERF_HISTORY_SLICES)
    // As mais velhas saem pela esquerda.
    expect(slices[0]?.fps).toBe(15)
    window.getState().clear()
    expect(window.getState().slices).toHaveLength(0)
  })

  it('é uma por instância; esquecer faz a próxima começar do zero', () => {
    const a = {}
    const b = {}
    perfWindowFor(a).getState().push(slice(60))
    expect(perfWindowFor(a).getState().slices).toHaveLength(1)
    expect(perfWindowFor(b).getState().slices).toHaveLength(0)
    forgetPerfWindow(a)
    expect(perfWindowFor(a).getState().slices).toHaveLength(0)
  })
})

describe('o resumo da janela', () => {
  it('conta cada sequência de fatias lentas como UMA vez e acha o quadro mais lento', () => {
    const summary = summarizePerf([
      slice(60),
      slice(22, 80),
      slice(18, 120),
      slice(58),
      slice(25, 70),
      slice(60),
    ])
    expect(summary.slowEpisodes).toBe(2)
    expect(summary.slowestFrameMs).toBe(120)
    expect(summary.seconds).toBe(3)
    expect(summary.latest?.fps).toBe(60)
  })

  it('jogo liso não fica lento nenhuma vez; janela vazia não tem última fatia', () => {
    expect(summarizePerf([slice(60), slice(59)]).slowEpisodes).toBe(0)
    expect(summarizePerf([])).toEqual({
      latest: null,
      slowEpisodes: 0,
      slowestFrameMs: 0,
      seconds: 0,
    })
  })
})
