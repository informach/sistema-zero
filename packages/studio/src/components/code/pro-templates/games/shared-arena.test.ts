import { afterEach, describe, expect, test } from 'bun:test'
import { SHARED_SOURCES } from './shared'

type Phase = 'menu' | 'playing' | 'paused' | 'won' | 'lost'
type Readiness = 'loading' | 'ready' | 'error'
type Action = 'left' | 'right' | 'up' | 'down' | 'action'
interface UI {
  phase: Phase
  readiness: Readiness
  reducedMotion: boolean
  reducedQuality: boolean
  controls: HTMLElement
  onReset(callback: (reason: 'start' | 'restart') => void): void
  onPhase(callback: (phase: Phase) => void): () => void
  onMotion(callback: () => void): () => void
  onResult(callback: (won: boolean, score: number) => void): () => void
  setReadiness(state: Readiness, message?: string, retry?: () => void): void
  finish(won: boolean, text: string, score?: number): void
  record(text: string): void
  pause(): void
  menu(): void
  tone(frequency?: number): void
  destroy(): void
}
interface Input {
  down(action: Action): boolean
  take(action: Action): boolean
  poll(): void
  clear(): void
  destroy(): void
}

const cleanup: Array<() => void> = []
afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) dispose()
})

/** Execute the actual materialized sources. Only browser boundary APIs are controlled. */
function browser() {
  const HappyWindow = (
    globalThis.window as unknown as {
      Window: new (options: { url: string }) => Window & { happyDOM: { close(): Promise<void> } }
    }
  ).Window
  const happy = new HappyWindow({ url: 'https://game.test/arena/index.html' })
  const window = happy as unknown as Window & typeof globalThis
  const document = window.document
  document.body.innerHTML = '<main id="app"></main>'
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  const motion = new window.EventTarget() as EventTarget & { matches: boolean }
  motion.matches = false
  Object.defineProperty(window, 'matchMedia', { value: () => motion })
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    value: (id: number) => frames.delete(id),
  })
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  cleanup.push(() => {
    frames.clear()
    void happy.happyDOM.close()
  })
  const transpiler = new Bun.Transpiler({ loader: 'ts', target: 'browser' })
  function load<T>(path: string, names: string[], extras: Record<string, unknown> = {}): T {
    const source = SHARED_SOURCES[path]!.replace("import './style.css'", '').replaceAll(
      'import.meta.hot',
      'undefined',
    )
    const code = transpiler.transformSync(source).replace(/^export\s+/gm, '')
    const globals = {
      window,
      document,
      navigator: window.navigator,
      localStorage: window.localStorage,
      location: window.location,
      AbortController: window.AbortController,
      HTMLInputElement: window.HTMLInputElement,
      HTMLTextAreaElement: window.HTMLTextAreaElement,
      HTMLButtonElement: window.HTMLButtonElement,
      HTMLSelectElement: window.HTMLSelectElement,
      HTMLElement: window.HTMLElement,
      requestAnimationFrame: window.requestAnimationFrame,
      cancelAnimationFrame: window.cancelAnimationFrame,
      ...extras,
    }
    return new Function(...Object.keys(globals), `${code}; return { ${names.join(',')} };`)(
      ...Object.values(globals),
    ) as T
  }
  const button = (id: string) => document.querySelector<HTMLButtonElement>(`#${id}`)!
  const key = (
    type: 'keydown' | 'keyup',
    code: string,
    repeat = false,
    target: EventTarget = window,
  ) =>
    target.dispatchEvent(
      new window.KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }),
    )
  const pointer = (action: Action, type: string, pointerId: number) => {
    const button = document.querySelector(`[data-action="${action}"]`)!
    Object.defineProperty(button, 'setPointerCapture', { configurable: true, value: () => {} })
    return button.dispatchEvent(
      new window.PointerEvent(type, { pointerId, bubbles: true, cancelable: true }),
    )
  }
  return {
    window,
    document,
    frames,
    motion,
    load,
    button,
    key,
    pointer,
    frame(now: number) {
      const ready = [...frames.values()]
      frames.clear()
      for (const callback of ready) callback(now)
    },
    ui(options?: { readiness: Readiness }, extras?: Record<string, unknown>) {
      const { createUI } = load<{
        createUI(title: string, help: string, options?: { readiness: Readiness }): UI
      }>('src/ui.ts', ['createUI'], extras)
      const ui = createUI('Arena', 'Setas e pulso', options)
      cleanup.push(() => ui.destroy())
      return ui
    },
    input(enabled: () => boolean) {
      const controls = document.createElement('div')
      document.body.append(controls)
      const { createInput } = load<{
        createInput(controls: HTMLElement, enabled: () => boolean): Input
      }>('src/input.ts', ['createInput'])
      const input = createInput(controls, enabled)
      cleanup.push(() => input.destroy())
      return input
    },
  }
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

describe('shared UI availability and lifecycle', () => {
  test('keeps the synchronous kit flow and distinguishes a fresh start from restart', () => {
    const b = browser(),
      ui = b.ui(),
      reasons: string[] = []
    ui.onReset((reason) => reasons.push(reason))
    expect(b.button('start').disabled).toBe(false)
    b.button('start').click()
    expect(ui.phase).toBe('playing')
    b.button('restart').click()
    expect(reasons).toEqual(['start', 'restart'])
    ui.menu()
    expect(ui.phase).toBe('menu')
    b.button('start').click()
    expect(reasons).toEqual(['start', 'restart', 'start'])
  })

  test('loading and errors cannot start a match; retry does not imply readiness', () => {
    const b = browser(),
      ui = b.ui({ readiness: 'loading' })
    let resets = 0,
      retries = 0
    ui.onReset(() => {
      resets++
    })
    b.button('start').click()
    expect(resets).toBe(0)
    ui.setReadiness('error', 'Imagem inválida', () => {
      retries++
      ui.setReadiness('loading', 'Carregando')
    })
    expect(b.document.querySelector('#status')!.textContent).toContain('Imagem inválida')
    b.button('retry').click()
    expect(retries).toBe(1)
    expect(ui.readiness).toBe('loading')
    expect(b.button('start').disabled).toBe(true)
    ui.setReadiness('ready')
    b.button('start').click()
    expect(resets).toBe(1)
    expect(ui.phase).toBe('playing')
    ui.destroy()
    ui.setReadiness('ready')
    expect(b.document.querySelector('canvas')).toBeNull()
    expect(b.document.querySelector('#app')!.childElementCount).toBe(0)
  })

  test('motion preference changes independently of the quality button and is disposed', () => {
    const b = browser(),
      ui = b.ui()
    let changes = 0
    ui.onMotion(() => {
      changes++
    })
    b.motion.matches = true
    b.motion.dispatchEvent(new b.window.Event('change'))
    expect(ui.reducedMotion).toBe(true)
    expect(ui.reducedQuality).toBe(false)
    expect(changes).toBe(1)
    ui.destroy()
    b.motion.matches = false
    b.motion.dispatchEvent(new b.window.Event('change'))
    expect(changes).toBe(1)
  })

  test('pause, mute, menu and disposal stop already scheduled sound voices', async () => {
    const voices: Array<{ stopped: boolean; disconnected: boolean }> = []
    let audio!: AudioBoundary
    class AudioBoundary {
      state = 'running'
      currentTime = 1
      destination = {}
      constructor() {
        audio = this
      }
      async resume() {
        this.state = 'running'
      }
      async close() {
        this.state = 'closed'
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
          disconnect() {},
        }
      }
      createOscillator() {
        const context = this
        const state = { stopped: false, disconnected: false }
        voices.push(state)
        return {
          frequency: { value: 0 },
          onended: null as null | (() => void),
          connect(target: unknown) {
            return target
          },
          start() {},
          stop(at?: number) {
            if (at === undefined || at <= context.currentTime) state.stopped = true
          },
          disconnect() {
            state.disconnected = true
          },
        }
      }
    }
    const b = browser(),
      ui = b.ui(undefined, { AudioContext: AudioBoundary })
    ui.onReset(() => {})
    b.button('start').click()
    ui.tone()
    expect(voices).toHaveLength(0)
    b.button('sound').click()
    await settle()
    ui.tone()
    expect(voices[0]?.stopped).toBe(false)
    ui.pause()
    expect(voices[0]).toEqual({ stopped: true, disconnected: true })
    b.button('start').click()
    audio.currentTime++
    ui.tone()
    b.button('sound').click()
    expect(voices[1]).toEqual({ stopped: true, disconnected: true })
    b.button('sound').click()
    await settle()
    audio.currentTime++
    ui.tone()
    ui.menu()
    expect(voices[2]).toEqual({ stopped: true, disconnected: true })
    b.button('start').click()
    audio.currentTime++
    ui.tone()
    ui.destroy()
    expect(voices[3]).toEqual({ stopped: true, disconnected: true })
    expect(audio.state).toBe('closed')
  })

  test('audio resume failure is reflected in the toggle', async () => {
    const resumed = deferred<void>()
    class AudioBoundary {
      resume = () => resumed.promise
      async close() {}
    }
    const b = browser(),
      ui = b.ui(undefined, { AudioContext: AudioBoundary })
    b.button('sound').click()
    resumed.reject(new Error('Audio unavailable'))
    await settle()
    expect(b.button('sound').getAttribute('aria-pressed')).toBe('false')
    expect(b.button('sound').textContent).toContain('indisponível')
    ui.destroy()
    expect(b.document.querySelector('#app')!.childElementCount).toBe(0)
  })
})

describe('shared input aggregate edges and rearming', () => {
  test('space plus touch creates one action edge and releases each source independently', () => {
    const b = browser(),
      input = b.input(() => true)
    b.key('keydown', 'Space')
    expect(input.take('action')).toBe(true)
    b.pointer('action', 'pointerdown', 11)
    expect(input.take('action')).toBe(false)
    b.key('keyup', 'Space')
    expect(input.down('action')).toBe(true)
    b.pointer('action', 'pointercancel', 11)
    expect(input.down('action')).toBe(false)
    b.pointer('action', 'pointerdown', 12)
    expect(input.take('action')).toBe(true)
  })

  test('diagonal and pulse accept three contacts and cancel without stuck actions', () => {
    const b = browser(),
      input = b.input(() => true)
    b.pointer('left', 'pointerdown', 1)
    b.pointer('up', 'pointerdown', 2)
    b.pointer('action', 'pointerdown', 3)
    expect([input.down('left'), input.down('up'), input.take('action')]).toEqual([true, true, true])
    b.pointer('left', 'lostpointercapture', 1)
    b.pointer('up', 'pointercancel', 2)
    b.pointer('action', 'pointerup', 3)
    expect([input.down('left'), input.down('up'), input.down('action')]).toEqual([
      false,
      false,
      false,
    ])
  })

  test('a queued edge survives a frame without simulation and is consumed once', () => {
    const b = browser(),
      input = b.input(() => true)
    b.key('keydown', 'Space')
    input.poll()
    input.poll()
    expect(input.take('action')).toBe(true)
    expect(input.take('action')).toBe(false)
    b.key('keydown', 'Space', true)
    expect(input.take('action')).toBe(false)
  })

  test('clear requires release before keyboard or a held gamepad may act again', () => {
    const b = browser(),
      input = b.input(() => true)
    let pressed = true
    const pad = () => ({
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0 && pressed })),
    })
    Object.defineProperty(b.window.navigator, 'getGamepads', { value: () => [pad()] })
    b.key('keydown', 'Space')
    input.poll()
    expect(input.take('action')).toBe(true)
    input.clear()
    input.poll()
    b.key('keydown', 'Space', true)
    expect(input.down('action')).toBe(false)
    expect(input.take('action')).toBe(false)
    b.key('keyup', 'Space')
    pressed = false
    input.poll()
    pressed = true
    input.poll()
    expect(input.take('action')).toBe(true)
  })

  test('a gamepad held while there is no RAF must return to neutral before resuming', () => {
    const b = browser()
    let enabled = false,
      pressed = true
    const input = b.input(() => enabled)
    Object.defineProperty(b.window.navigator, 'getGamepads', {
      value: () => [{ connected: true, axes: [pressed ? -1 : 0, 0], buttons: [] }],
    })
    input.clear()
    enabled = true
    input.poll()
    expect(input.down('left')).toBe(false)
    pressed = false
    input.poll()
    pressed = true
    input.poll()
    expect(input.down('left')).toBe(true)
  })

  test('keyboard and gamepad share one edge and a fresh key gesture recovers from blur', () => {
    const b = browser(),
      input = b.input(() => true)
    let pressed = false
    Object.defineProperty(b.window.navigator, 'getGamepads', {
      value: () => [{ connected: true, axes: [0, 0], buttons: [{ pressed }] }],
    })
    b.key('keydown', 'Space')
    expect(input.take('action')).toBe(true)
    pressed = true
    input.poll()
    expect(input.take('action')).toBe(false)
    b.key('keyup', 'Space')
    expect(input.down('action')).toBe(true)
    pressed = false
    input.poll()
    b.key('keydown', 'Space')
    expect(input.take('action')).toBe(true)
    b.window.dispatchEvent(new b.window.Event('blur'))
    b.key('keydown', 'Space', true)
    expect(input.take('action')).toBe(false)
    b.key('keydown', 'Space')
    expect(input.take('action')).toBe(true)
  })

  test('typing in a contenteditable surface does not move the game', () => {
    const b = browser(),
      input = b.input(() => true)
    const editor = b.document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    b.document.body.append(editor)
    b.key('keydown', 'KeyA', false, editor)
    expect(input.down('left')).toBe(false)
  })
})

describe('shared progress acknowledgement', () => {
  test('loads before writing, shows pending, and confirms only after storage ACK', async () => {
    const b = browser(),
      ui = b.ui(),
      read = deferred<string | null>(),
      ack = deferred<void>()
    const writes: string[] = []
    Object.assign(b.window, {
      szGameStorage: {
        get: () => read.promise,
        set: (_key: string, value: string) => {
          writes.push(value)
          return ack.promise
        },
      },
    })
    const { createProgress } = b.load<{ createProgress(ui: UI, kit: string): () => void }>(
      'src/progress.ts',
      ['createProgress'],
    )
    cleanup.push(createProgress(ui, 'arena'))
    ui.onReset(() => {})
    b.button('start').click()
    ui.finish(true, 'Vitória', 12)
    await settle()
    expect(writes).toHaveLength(0)
    read.resolve(JSON.stringify({ version: 1, best: 8, wins: 2 }))
    await settle()
    expect(writes.map((value) => JSON.parse(value))).toEqual([{ version: 1, best: 12, wins: 3 }])
    expect(b.document.querySelector('#record')!.textContent).toContain('Guardando')
    expect(b.document.querySelector('#record')!.textContent).not.toContain('Recorde: 12')
    ack.resolve()
    await settle()
    expect(b.document.querySelector('#record')!.textContent).toContain('Recorde: 12 · Vitórias: 3')
  })

  test('malformed saves are not silently reset or overwritten', async () => {
    const b = browser(),
      ui = b.ui()
    let writes = 0
    Object.assign(b.window, {
      szGameStorage: {
        async get() {
          return '{bad'
        },
        async set() {
          writes++
        },
      },
    })
    const { createProgress } = b.load<{ createProgress(ui: UI, kit: string): () => void }>(
      'src/progress.ts',
      ['createProgress'],
    )
    cleanup.push(createProgress(ui, 'arena'))
    await settle()
    expect(b.document.querySelector('#record')!.textContent).not.toContain('Recorde: 0')
    ui.onReset(() => {})
    b.button('start').click()
    ui.finish(true, 'Vitória', 12)
    await settle()
    expect(ui.phase).toBe('won')
    expect(b.document.querySelector('#record')!.textContent).toContain('Não foi possível')
    expect(writes).toBe(0)
  })

  test('a rejected write preserves the last confirmed record and never claims the new one', async () => {
    const b = browser(),
      ui = b.ui(),
      ack = deferred<void>()
    Object.assign(b.window, {
      szGameStorage: {
        async get() {
          return JSON.stringify({ version: 1, best: 8, wins: 2 })
        },
        set: () => ack.promise,
      },
    })
    const { createProgress } = b.load<{ createProgress(ui: UI, kit: string): () => void }>(
      'src/progress.ts',
      ['createProgress'],
    )
    cleanup.push(createProgress(ui, 'arena'))
    await settle()
    ui.onReset(() => {})
    b.button('start').click()
    ui.finish(true, 'Vitória', 12)
    await settle()
    expect(b.document.querySelector('#record')!.textContent).toContain('Guardando')
    expect(b.document.querySelector('#record')!.textContent).toContain('Recorde: 8')
    ack.reject(new Error('quota'))
    await settle()
    expect(ui.phase).toBe('won')
    expect(b.document.querySelector('#record')!.textContent).toContain('Não foi possível')
    expect(b.document.querySelector('#record')!.textContent).not.toContain('Recorde: 12')
  })

  test('disposing progress ignores a late read acknowledgement', async () => {
    const b = browser(),
      ui = b.ui(),
      read = deferred<string | null>()
    Object.assign(b.window, { szGameStorage: { get: () => read.promise, async set() {} } })
    const { createProgress } = b.load<{ createProgress(ui: UI, kit: string): () => void }>(
      'src/progress.ts',
      ['createProgress'],
    )
    const stop = createProgress(ui, 'arena')
    stop()
    ui.record('Outro ciclo')
    read.resolve(JSON.stringify({ version: 1, best: 8, wins: 2 }))
    await settle()
    expect(b.document.querySelector('#record')!.textContent).toBe('Outro ciclo')
  })
})

test('one frame owner clamps elapsed time, reports discarded time and stops when inactive', () => {
  const b = browser(),
    deltas: number[] = [],
    discarded: number[] = []
  let active = true
  const { frameLoop } = b.load<{
    frameLoop(
      frame: (dt: number) => void,
      active: () => boolean,
      options: { onDiscard(seconds: number): void },
    ): { request(): void; dispose(): void }
  }>('src/lifecycle.ts', ['frameLoop'])
  const loop = frameLoop(
    (dt) => deltas.push(dt),
    () => active,
    { onDiscard: (seconds) => discarded.push(seconds) },
  )
  cleanup.push(() => loop.dispose())
  loop.request()
  expect(b.frames.size).toBe(1)
  b.frame(100)
  b.frame(300)
  expect(deltas).toEqual([0, 0.05])
  expect(discarded[0]).toBeCloseTo(0.15)
  active = false
  b.frame(316)
  expect(b.frames.size).toBe(0)
  loop.request()
  b.frame(1000)
  expect(deltas.at(-1)).toBe(0)
  expect(b.frames.size).toBe(0)
  loop.dispose()
  loop.request()
  expect(b.frames.size).toBe(0)
})

test('inspection stays read-only and disposing an old observer preserves the newer session', () => {
  const b = browser()
  type Inspector = { version: number; inspect(): { score: number } }
  const target = b.window as unknown as { __studioGame?: Inspector }
  const { exposeGameInspection } = b.load<{
    exposeGameInspection(game: { inspect(): { score: number }; dispose(): void }): () => void
  }>('src/lifecycle.ts', ['exposeGameInspection'])
  const closeFirst = exposeGameInspection({ inspect: () => ({ score: 1 }), dispose() {} })
  const closeSecond = exposeGameInspection({ inspect: () => ({ score: 2 }), dispose() {} })
  expect(Object.keys(target.__studioGame!)).toEqual(['version', 'inspect'])
  expect(Object.isFrozen(target.__studioGame)).toBe(true)
  closeFirst()
  expect(target.__studioGame?.inspect()).toEqual({ score: 2 })
  closeSecond()
  expect(target.__studioGame).toBeUndefined()
})
