import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  type CanvasSpy,
  type Harness,
  installCanvasSpy,
  loadRuntime,
  startPlaying,
} from '../../official-extensions/game-2d-advanced/__tests__/kitHarness'
import { buildDevtoolsBridgeRuntime } from '../devtoolsBridge'
import { isDevtoolsPerfMessage, isDevtoolsStateMessage } from '../devtoolsMessage'

/**
 * A ponte das abas Investigar e Desempenho com o motor de VERDADE do Jogo 2D Avançado na mesma
 * janela (o texto do runtime e o texto da ponte, como a prévia monta: o motor primeiro, a ponte
 * depois). O quadro da tela roda o laço do motor e depois o que a ponte pediu, na ordem do
 * navegador.
 */

type Message = Record<string, unknown>

interface Montagem {
  h: Harness
  spy: CanvasSpy & { restore: () => void }
  quadro: (ms?: number) => void
  comando: (cmd: string) => void
  estados: () => Message[]
  fatias: () => Message[]
  meioSegundo: () => void
}

const QUADRO_MS = 1000 / 60

let atual: Montagem | null = null

async function montar(options: { measure?: boolean } = {}): Promise<Montagem> {
  const spy = installCanvasSpy()
  const posted: Message[] = []
  const parent = {
    postMessage: (message: Message) => {
      posted.push(message)
    },
  }
  const pedidos: ((now: number) => void)[] = []
  const timers: (() => void)[] = []
  let relogio = 0
  const h = loadRuntime({
    __SZSTUDIO_RUNTIME_INSPECTORS: {},
    performance: { now: () => relogio },
    parent,
    requestAnimationFrame: (callback: (now: number) => void) => {
      pedidos.push(callback)
      return pedidos.length
    },
  })
  const listeners: ((event: unknown) => void)[] = []
  const addEventListener = h.window.addEventListener as (
    name: string,
    fn: (event: unknown) => void,
  ) => void
  h.window.addEventListener = (name: string, fn: (event: unknown) => void) => {
    if (name === 'message') listeners.push(fn)
    else addEventListener(name, fn)
  }
  await startPlaying(h, 400, 300)
  const scope = `__sz${'c'.repeat(24)}`
  const leitor = Object.freeze({
    names: () => ['pontos'],
    get: (name: string) => (name === 'pontos' ? { v: 3 } : null),
  })
  new Function(
    'window',
    'document',
    'globalThis',
    'setInterval',
    buildDevtoolsBridgeRuntime('https://editor.test', {
      measure: options.measure ?? false,
      scope,
    }),
  )(h.window, { querySelector: () => ({}) }, { [scope]: leitor }, (fn: () => void) => {
    timers.push(fn)
    return 1
  })
  atual = {
    h,
    spy,
    quadro: (ms = QUADRO_MS) => {
      relogio += ms
      h.nextFrame(relogio)
      const daPonte = pedidos.splice(0)
      for (const callback of daPonte) callback(relogio)
    },
    comando: (cmd) => {
      for (const listener of listeners)
        listener({ source: parent, data: { type: 'sz:devtools', cmd } })
    },
    estados: () => posted.filter((m) => m.type === 'sz:devtools:state'),
    fatias: () => posted.filter((m) => m.type === 'sz:devtools:perf'),
    meioSegundo: () => {
      for (const timer of timers) timer()
    },
  }
  return atual
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  atual?.spy.restore()
  atual = null
})

describe('a ponte com o Jogo 2D Avançado de verdade', () => {
  it('Pausar usa a pausa do motor, e pausado o quadro não anda', async () => {
    const m = await montar()
    for (let i = 0; i < 3; i += 1) m.quadro()
    m.comando('pause')
    const pausado = m.estados().at(-1)
    expect(isDevtoolsStateMessage(pausado)).toBe(true)
    expect(pausado).toMatchObject({ frame: 3, paused: true, canPause: true, pauseLater: false })
    expect(pausado?.values).toEqual([{ name: 'pontos', text: '3' }])
    expect(m.h.api.state()).toBe('pausado')
    for (let i = 0; i < 5; i += 1) m.quadro()
    m.comando('look')
    expect(m.estados().at(-1)).toMatchObject({ frame: 3, paused: true })
  })

  it('Avançar 1 quadro anda um quadro e responde já pausado', async () => {
    const m = await montar()
    m.quadro()
    m.comando('pause')
    const antes = m.estados().length
    m.comando('step')
    expect(m.estados()).toHaveLength(antes)
    for (let i = 0; i < 3; i += 1) m.quadro()
    expect(m.estados().at(-1)).toMatchObject({ frame: 2, paused: true })
    expect(m.h.api.state()).toBe('pausado')
  })

  it('Avançar com o relógio fixo também anda exatamente um quadro', async () => {
    const m = await montar()
    m.h.api.enableFixedSimulation({ hz: 60, seed: 3, maxCatchUpSteps: 5 })
    m.quadro()
    m.comando('pause')
    const quadro = m.estados().at(-1)?.frame as number
    m.comando('step')
    m.quadro(QUADRO_MS / 4)
    m.quadro(QUADRO_MS * 2.5)
    m.quadro(QUADRO_MS * 2.5)
    expect(m.estados().at(-1)).toMatchObject({ frame: quadro + 1, paused: true })
  })

  it('a pausa do próprio jogo (a tecla de pausa) aparece na aba', async () => {
    const m = await montar()
    m.quadro()
    m.meioSegundo()
    expect(m.estados().at(-1)).toMatchObject({ paused: false })
    m.h.api.pause()
    m.meioSegundo()
    expect(m.estados().at(-1)).toMatchObject({ paused: true })
  })

  it('fora do "jogando" (no menu), a aba diz que não pausa', async () => {
    const m = await montar()
    m.h.api.returnToMenu()
    m.comando('pause')
    const noMenu = m.estados().at(-1)
    expect(isDevtoolsStateMessage(noMenu)).toBe(true)
    expect(noMenu).toMatchObject({ paused: false, canPause: false, pauseLater: true })
    expect(m.h.api.state()).toBe('menu')
  })

  it('a medida leva quantos personagens o motor desenhou no último quadro', async () => {
    const m = await montar({ measure: true })
    const heroi = m.h.api.createCharacter({ w: 16, h: 16 })
    const amigo = m.h.api.createCharacter({ w: 16, h: 16 })
    m.h.api.onDraw(() => {
      m.h.api.drawCharacter(heroi)
      m.h.api.drawCharacter(amigo)
    })
    for (let i = 0; i < 40; i += 1) m.quadro()
    const fatia = m.fatias().at(-1)
    expect(isDevtoolsPerfMessage(fatia)).toBe(true)
    expect(fatia).toMatchObject({ sprites: 2 })
  })
})
