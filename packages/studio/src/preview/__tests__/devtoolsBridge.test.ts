import { describe, expect, it } from 'bun:test'
import { buildPreviewDoc } from '../bootstrap'
import {
  buildDevtoolsBridgeRuntime,
  DEVTOOLS_PERF_MESSAGE,
  isDevtoolsPerfMessage,
  isDevtoolsStateMessage,
  listenToDevtoolsPerf,
  perfWindowFor,
} from '../devtoolsBridge'

/**
 * A ponte da aba Desempenho (proposta aprovada em 20/11/2026). É uma string de JavaScript que
 * roda dentro do jogo: aqui ela roda sobre uma janela de mentira, com o relógio de quadros na mão.
 */

interface Posted {
  message: Record<string, unknown>
  origin: string
}

function runBridge(options: { drawn?: number | (() => never); canvas?: boolean } = {}) {
  const posted: Posted[] = []
  let pending: ((now: number) => void) | null = null
  const parent = {
    postMessage(message: Record<string, unknown>, origin: string) {
      posted.push({ message, origin })
    },
  }
  const inspectors: Record<string, unknown> = Object.create(null)
  if (options.drawn !== undefined) {
    const drawn = options.drawn
    inspectors['game-2d:observation'] = () => ({
      lifecycle: () => (typeof drawn === 'function' ? drawn() : { drawn }),
    })
  }
  const window = {
    parent,
    requestAnimationFrame(callback: (now: number) => void) {
      pending = callback
      return 1
    },
    __SZSTUDIO_RUNTIME_INSPECTORS: inspectors,
  }
  const document = {
    querySelector: (selector: string) =>
      selector === 'canvas' && options.canvas !== false ? {} : null,
  }
  new Function('window', 'document', buildDevtoolsBridgeRuntime('https://editor.test'))(
    window,
    document,
  )
  const frame = (now: number) => {
    const callback = pending
    pending = null
    callback?.(now)
  }
  return { posted, frame }
}

describe('a ponte da aba Desempenho', () => {
  it('manda uma fatia a cada meio segundo, com os quadros e o maior intervalo, só para o editor', () => {
    const { posted, frame } = runBridge({ drawn: 7 })
    // 0 é o começo da fatia; depois 30 quadros de 16 ms, um de 120 ms no meio.
    let now = 0
    frame(now)
    for (let i = 0; i < 30; i++) {
      now += i === 10 ? 120 : 16
      frame(now)
    }
    expect(posted).toHaveLength(1)
    const [{ message, origin }] = posted as [Posted]
    expect(origin).toBe('https://editor.test')
    expect(message.type).toBe(DEVTOOLS_PERF_MESSAGE)
    // A fatia fecha no primeiro quadro que passa de meio segundo: 24 de 16 ms e um de 120 = 504.
    expect(message.frames).toBe(25)
    expect(message.frameMsAvg).toBeCloseTo(504 / 25)
    expect(message.frameMsMax).toBe(120)
    expect(message.sprites).toBe(7)
    expect(message.canvas).toBe(true)
    expect(Number.isInteger(message.doc) && (message.doc as number) > 0).toBe(true)
    expect(isDevtoolsPerfMessage(message)).toBe(true)
    expect(message.ms).toBe(504)
  })

  it('sem o inspetor do motor (ou com ele quebrado), os sprites ficam sem leitura', () => {
    for (const drawn of [
      undefined,
      () => {
        throw Error('falhou')
      },
    ] as const) {
      const { posted, frame } = runBridge({ drawn })
      frame(0)
      for (let now = 100; now <= 600; now += 100) frame(now)
      expect(posted[0]?.message.sprites).toBeNull()
    }
  })

  it('uma página sem canvas avisa que não tem quadros de jogo', () => {
    const { posted, frame } = runBridge({ canvas: false })
    frame(0)
    frame(600)
    expect(posted[0]?.message.canvas).toBe(false)
  })

  it('a mensagem é conferida: tipo, números finitos e na faixa', () => {
    const ok = {
      type: DEVTOOLS_PERF_MESSAGE,
      ms: 500,
      frames: 30,
      frameMsAvg: 16,
      frameMsMax: 20,
      sprites: 2,
      canvas: true,
      doc: 3,
    }
    expect(isDevtoolsPerfMessage(ok)).toBe(true)
    expect(isDevtoolsPerfMessage({ ...ok, sprites: null })).toBe(true)
    for (const bad of [
      null,
      { ...ok, type: 'sz:preview' },
      { ...ok, ms: 0 },
      { ...ok, frames: Number.NaN },
      { ...ok, frameMsMax: -1 },
      { ...ok, sprites: 1.5 },
      { ...ok, canvas: 'sim' },
      { ...ok, doc: 0 },
      { ...ok, doc: 1.5 },
    ])
      expect(isDevtoolsPerfMessage(bad)).toBe(false)
  })
})

describe('o custo da medida', () => {
  it('cabe muito abaixo de 5% de um quadro de 60 por segundo (0,83 ms)', () => {
    const { frame } = runBridge({ drawn: 12 })
    const frames = 20_000
    // Esquenta e mede: cada quadro do jogo passa pela ponte uma vez (e uma fatia a cada 30).
    for (let i = 0; i < 2_000; i++) frame(i * 16.7)
    const start = performance.now()
    for (let i = 2_000; i < 2_000 + frames; i++) frame(i * 16.7)
    const perFrameMs = (performance.now() - start) / frames
    expect(perFrameMs).toBeLessThan(0.05 * (1000 / 60))
  })
})

describe('o documento da prévia', () => {
  const base = {
    html: '<canvas></canvas>',
    css: '',
    js: 'console.log(1)',
    parentOrigin: 'https://editor.test',
  }

  it('sem a aba aberta, não leva a ponte nem o registro dos inspetores', () => {
    const doc = buildPreviewDoc(base)
    expect(doc).not.toContain(DEVTOOLS_PERF_MESSAGE)
    expect(doc).not.toContain('__SZSTUDIO_RUNTIME_INSPECTORS')
  })

  it('com a medida ligada (como a prévia monta), leva os dois, o registro antes da ponte', () => {
    const doc = buildPreviewDoc({
      ...base,
      runtimeInspection: true,
      extensionScripts: [buildDevtoolsBridgeRuntime(base.parentOrigin)],
    })
    const registry = doc.indexOf('__SZSTUDIO_RUNTIME_INSPECTORS = Object.create(null)')
    const bridge = doc.indexOf(DEVTOOLS_PERF_MESSAGE)
    expect(registry).toBeGreaterThan(-1)
    expect(bridge).toBeGreaterThan(registry)
  })
})

describe('quem escuta as fatias, no editor', () => {
  const fatia = (doc: number, frames = 30) => ({
    type: DEVTOOLS_PERF_MESSAGE,
    ms: 500,
    frames,
    frameMsAvg: 16,
    frameMsMax: 20,
    sprites: 2,
    canvas: true,
    doc,
  })

  it('aceita só o iframe da prévia, e um jogo novo recomeça a janela; mensagem atrasada do anterior é ignorada', () => {
    const frame = {} as Window
    const other = {} as Window
    const instance = {}
    const stop = listenToDevtoolsPerf(() => frame, instance)
    const send = (source: Window, data: unknown) =>
      window.dispatchEvent(new MessageEvent('message', { data, source: source as never }))
    try {
      send(other, fatia(1))
      expect(perfWindowFor(instance).getState().slices).toHaveLength(0)
      send(frame, fatia(1))
      send(frame, fatia(1, 15))
      expect(
        perfWindowFor(instance)
          .getState()
          .slices.map((s) => s.fps),
      ).toEqual([60, 30])
      send(frame, fatia(2, 24))
      expect(
        perfWindowFor(instance)
          .getState()
          .slices.map((s) => s.fps),
      ).toEqual([48])
      send(frame, fatia(1))
      expect(perfWindowFor(instance).getState().slices).toHaveLength(1)
    } finally {
      stop()
    }
    send(frame, fatia(3))
    expect(perfWindowFor(instance).getState().slices).toHaveLength(1)
  })
})

describe('a ponte da aba Investigar', () => {
  function runInvestigation(options: { paused?: boolean; frame?: number; noGame?: boolean } = {}) {
    const posted: Posted[] = []
    const listeners: Record<string, ((event: unknown) => void)[]> = {}
    let pending: ((now: number) => void) | null = null
    let paused = options.paused ?? false
    let frame = options.frame ?? 41
    const calls: string[] = []
    const parent = {
      postMessage(message: Record<string, unknown>, origin: string) {
        posted.push({ message, origin })
      },
    }
    const reader = Object.freeze({
      names: () => ['pontos', 'heroi', 'nome', 'acao', 'itens'],
      get: (name: string) =>
        ({
          pontos: { v: 2.5 },
          heroi: { v: { x: 148, y: 108, w: 32 } },
          nome: { v: 'Zé' },
          acao: { v: () => 1 },
          itens: { v: [1, 2, 3] },
        })[name] ?? null,
    })
    const window: Record<string, unknown> = {
      parent,
      requestAnimationFrame(callback: (now: number) => void) {
        pending = callback
        return 1
      },
      addEventListener(type: string, listener: (event: unknown) => void) {
        listeners[type] = [...(listeners[type] ?? []), listener]
      },
      __SZSTUDIO_RUNTIME_INSPECTORS: {
        'game-2d:observation': () => ({ lifecycle: () => ({ frame, paused, drawn: 2 }) }),
      },
      __SZ_USER_JS_TAIL: 'QUJD',
      __szReportCaughtError: () => {
        calls.push('interceptor')
      },
    }
    if (!options.noGame)
      window.SZGame2D = {
        pauseGame: () => {
          calls.push('pause')
          paused = true
        },
        resumeGame: () => {
          calls.push('resume')
          paused = false
        },
      }
    const fakeGlobal = { __szabc: reader }
    const timers: (() => void)[] = []
    const setInterval = (fn: () => void) => {
      timers.push(fn)
      return 1
    }
    const source = buildDevtoolsBridgeRuntime('https://editor.test', {
      scope: '__szabc',
      labels: {
        empty: 'vazio',
        yes: 'verdadeiro',
        no: 'falso',
        listOne: 'lista com 1 item',
        listMany: 'lista com {count} itens',
        object: 'objeto',
        decimal: ',',
      },
    })
    new Function('window', 'document', 'globalThis', 'setInterval', source)(
      window,
      { querySelector: () => ({}) },
      fakeGlobal,
      setInterval,
    )
    const command = (cmd: string, from: unknown = parent) => {
      for (const listener of listeners.message ?? [])
        listener({ source: from, data: { type: 'sz:devtools', cmd } })
    }
    const nextFrame = () => {
      const callback = pending
      pending = null
      frame++
      callback?.(0)
    }
    const states = () => posted.map((p) => p.message).filter((m) => m.type === 'sz:devtools:state')
    return {
      posted,
      states,
      command,
      nextFrame,
      calls,
      timers,
      window,
      listeners,
      setFrame: (n: number) => (frame = n),
    }
  }

  it('pausa e continua pela pausa do motor, só a pedido do parent, e responde com o estado', () => {
    const game = runInvestigation()
    game.command('pause', {})
    expect(game.calls).toEqual([])
    game.command('pause')
    expect(game.calls).toEqual(['pause'])
    const [state] = game.states()
    expect(state).toMatchObject({ frame: 41, paused: true, canPause: true, error: null })
    expect(isDevtoolsStateMessage(state)).toBe(true)
    // Os valores com o texto da criança: número com vírgula, sprite pela posição, texto entre
    // aspas, lista contada; a função não aparece.
    expect(state?.values).toEqual([
      { name: 'pontos', text: '2,5' },
      { name: 'heroi', text: 'x 148 · y 108' },
      { name: 'nome', text: '"Zé"' },
      { name: 'itens', text: 'lista com 3 itens' },
    ])
    game.command('resume')
    expect(game.calls).toEqual(['pause', 'resume'])
  })

  it('avançar 1 quadro continua e pausa de novo no quadro seguinte, e então responde', () => {
    const game = runInvestigation({ paused: true, frame: 10 })
    game.command('step')
    expect(game.calls).toEqual(['resume'])
    expect(game.states()).toHaveLength(0)
    game.nextFrame()
    expect(game.calls).toEqual(['resume', 'pause'])
    expect(game.states().at(-1)).toMatchObject({ frame: 11, paused: true })
  })

  it('sem a pausa do motor, diz que não pausa e ainda manda os valores', () => {
    const game = runInvestigation({ noGame: true })
    game.command('pause')
    expect(game.states()[0]).toMatchObject({ canPause: false, paused: false })
  })

  it('com o jogo rodando, os valores chegam sozinhos; pausado, ficam parados', () => {
    const game = runInvestigation()
    expect(game.timers).toHaveLength(1)
    game.timers[0]?.()
    expect(game.states()).toHaveLength(1)
    game.command('pause')
    game.timers[0]?.()
    expect(game.states()).toHaveLength(2)
  })

  it('quando o jogo para com erro, manda as linhas do script da criança e passa o erro adiante', () => {
    const game = runInvestigation()
    const error = {
      stack: [
        'TypeError: x',
        '    at a (data:...QUJD:12:5)',
        '    at engine (about:srcdoc:900:1)',
        '    at b (data:...QUJD:7:3)',
      ].join('\n'),
    }
    ;(game.window.__szReportCaughtError as (e: unknown) => void)(error)
    expect(game.calls).toEqual(['interceptor'])
    expect(game.states().at(-1)).toMatchObject({ error: { lines: [12, 7] } })
    for (const listener of game.listeners.error ?? []) listener({ error })
    expect(game.states().at(-1)).toMatchObject({ error: { lines: [12, 7] } })
  })
})
