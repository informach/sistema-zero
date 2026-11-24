import { describe, expect, it } from 'bun:test'
import { investigationWindowFor, perfWindowFor, programTimeFor } from '../../state/devtools'
import { readZappyObservation, type ZappyObservedRun } from './zappyObservation'

/**
 * Lote 5 da missão (seção 15, 21/11/2026): o Zappy só recebe o que a aba que a criança LIGOU
 * mostra, lido na hora da pergunta. Revisão do lote 5: só o que a aba está MOSTRANDO (as mesmas
 * condições de tela do `InvestigatePanel` e do `PerformancePanel`).
 */
const slice = (fps: number, sprites: number | null = 12, canvas = true) => ({
  fps,
  frameMsAvg: 1000 / Math.max(1, fps),
  frameMsMax: fps < 30 ? 90 : 18,
  sprites,
  objects: null,
  draws: null,
  canvas,
})
const running: ZappyObservedRun = { phase: 'running', runtimeError: false, python: false }
const reading = (frame: number, values: { name: string; text: string }[], error = false) => ({
  frame,
  paused: false,
  canPause: true,
  pauseLater: false,
  values,
  error: error ? { lines: [3] } : null,
})

describe('readZappyObservation', () => {
  it('com as abas desligadas, nada sai, mesmo com dados guardados', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive(reading(3, [{ name: 'pontos', text: '7' }]))
    perfWindowFor(ui).getState().push(slice(60))
    expect(readZappyObservation(ui, { measuring: false, investigating: false }, running)).toEqual({
      observing: { investigate: false, performance: false },
    })
  })

  it('a aba Investigar ligada manda os valores e o quadro de agora, com o jogo rodando', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive({ ...reading(41, [{ name: 'pontos', text: '7' }]), paused: true })
    expect(readZappyObservation(ui, { measuring: false, investigating: true }, running)).toEqual({
      observing: { investigate: true, performance: false },
      investigation: { frame: 41, paused: true, values: [{ name: 'pontos', text: '7' }] },
    })
  })

  // Full review final (21/11/2026): sem a lista vazia, o modelo lia "aba ligada sem leitura" e
  // mandava rodar de novo um jogo que já rodava.
  it('o jogo rodando sem variáveis manda a lista vazia, não "sem leitura"', () => {
    const ui = {}
    investigationWindowFor(ui).getState().receive(reading(12, []))
    expect(
      readZappyObservation(ui, { measuring: false, investigating: true }, running).investigation,
    ).toEqual({ frame: 12, paused: false, values: [] })
  })

  it('depois de Parar, a aba diz "não está rodando" e os valores guardados não vão', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive(reading(41, [{ name: 'pontos', text: '7' }]))
    const stopped = readZappyObservation(
      ui,
      { measuring: false, investigating: true },
      { phase: 'idle', runtimeError: false, python: false },
    )
    expect(stopped.investigation).toBeUndefined()
    expect(stopped.observing).toEqual({ investigate: true, performance: false })
  })

  it('o jogo que parou com erro manda os valores daquele momento, uma vez só', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive(reading(12, [{ name: 'vidas', text: '0' }], true))
    const observation = readZappyObservation(
      ui,
      { measuring: false, investigating: true },
      { phase: 'error', runtimeError: true, python: false },
    )
    expect(observation.investigation).toEqual({
      frame: 12,
      paused: false,
      values: [],
      stopped: { frame: 12, values: [{ name: 'vidas', text: '0' }] },
    })
  })

  it('erro guardado com o jogo rodando de novo não vira "parou com erro"', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive(reading(12, [{ name: 'vidas', text: '0' }], true))
    const observation = readZappyObservation(ui, { measuring: false, investigating: true }, running)
    expect(observation.investigation?.stopped).toBeUndefined()
  })

  it('no Python, esperar a entrada e o programa que terminou mostram os valores', () => {
    const ui = {}
    investigationWindowFor(ui)
      .getState()
      .receive(reading(5, [{ name: 'nome', text: 'Bia' }]))
    for (const phase of ['waiting', 'done'])
      expect(
        readZappyObservation(
          ui,
          { measuring: false, investigating: true },
          { phase, runtimeError: false, python: true },
        ).investigation?.values,
      ).toEqual([{ name: 'nome', text: 'Bia' }])
  })

  it('a aba Desempenho ligada manda o resumo dos cartões', () => {
    const ui = {}
    const window = perfWindowFor(ui).getState()
    for (const fps of [60, 58, 20, 22, 59, 18]) window.push(slice(fps, 300))
    expect(
      readZappyObservation(ui, { measuring: true, investigating: false }, running).performance,
    ).toEqual({
      seconds: 3,
      fpsNow: 18,
      fpsMin: 18,
      slowEpisodes: 2,
      slowestFrameMs: 90,
      sprites: 300,
      objects: null,
      draws: null,
    })
  })

  it('página sem canvas não manda quadros por segundo (a aba diz que não há quadros)', () => {
    const ui = {}
    const window = perfWindowFor(ui).getState()
    for (const fps of [60, 0, 0]) window.push(slice(fps, null, false))
    expect(
      readZappyObservation(ui, { measuring: true, investigating: false }, running).performance,
    ).toBeUndefined()
  })

  it('programa Python sem tela não manda quadros por segundo (a aba mostra o tempo)', () => {
    const ui = {}
    programTimeFor(ui).setState({ canvas: false })
    const window = perfWindowFor(ui).getState()
    for (const fps of [0, 0, 0]) window.push(slice(fps, null, true))
    expect(
      readZappyObservation(
        ui,
        { measuring: true, investigating: false },
        { ...running, python: true },
      ).performance,
    ).toBeUndefined()
  })

  it('a medida recusada ou ainda vazia não vira número', () => {
    const ui = {}
    expect(readZappyObservation(ui, { measuring: true, investigating: true }, running)).toEqual({
      observing: { investigate: true, performance: true },
    })
    perfWindowFor(ui).getState().refuse()
    expect(
      readZappyObservation(ui, { measuring: true, investigating: false }, running).performance,
    ).toBeUndefined()
  })
})
