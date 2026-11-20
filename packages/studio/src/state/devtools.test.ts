import { describe, expect, it } from 'bun:test'
import { summarizePerf } from '../components/devtools/perfSummary'
import {
  createInvestigationWindow,
  createPerfWindow,
  forgetInvestigationWindow,
  forgetPerfWindow,
  investigationWindowFor,
  PERF_HISTORY_SLICES,
  type PerfSlice,
  perfWindowFor,
  sendDevtoolsCommand,
  setDevtoolsSender,
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

describe('a janela da aba Investigar', () => {
  const reading = (values: [string, string][]) => ({
    frame: 10,
    paused: true,
    canPause: true,
    pauseLater: false,
    values: values.map(([name, text]) => ({ name, text })),
    error: null,
  })

  it('marca o valor que mudou desde a leitura anterior', () => {
    const window = createInvestigationWindow()
    window.getState().receive(
      reading([
        ['pontos', '0'],
        ['estado', '"inicio"'],
      ]),
    )
    expect(window.getState().values.every((v) => !v.changed)).toBe(true)
    window.getState().receive(
      reading([
        ['pontos', '0'],
        ['estado', '"jogando"'],
        ['novo', '1'],
      ]),
    )
    expect(window.getState().values.map((v) => [v.name, v.changed])).toEqual([
      ['pontos', false],
      ['estado', true],
      ['novo', false],
    ])
  })

  it('guarda o PRIMEIRO erro, com o quadro, as linhas e os valores daquele momento', () => {
    const window = createInvestigationWindow()
    window
      .getState()
      .receive({ ...reading([['vidas', '3']]), frame: 312, error: { lines: [12, 7] } })
    window.getState().receive({ ...reading([['vidas', '2']]), frame: 313, error: { lines: [99] } })
    expect(window.getState().stopped).toEqual({
      frame: 312,
      lines: [12, 7],
      values: [{ name: 'vidas', text: '3', changed: false }],
    })
    window.getState().clear()
    expect(window.getState()).toMatchObject({ ready: false, stopped: null, values: [] })
  })

  it('o painel manda comandos ao jogo pela prévia registrada da instância', () => {
    const instance = {}
    const sent: string[] = []
    expect(sendDevtoolsCommand(instance, 'pause')).toBe(false)
    setDevtoolsSender(instance, (cmd) => sent.push(cmd))
    expect(sendDevtoolsCommand(instance, 'step')).toBe(true)
    setDevtoolsSender(instance, null)
    expect(sendDevtoolsCommand(instance, 'resume')).toBe(false)
    expect(sent).toEqual(['step'])
    forgetInvestigationWindow(instance)
    expect(investigationWindowFor(instance).getState().ready).toBe(false)
  })
})
