import { describe, expect, it } from 'bun:test'
import { buildInputBridgeRuntime, buildInputRuntime } from '../inputBridge'

interface InputApi {
  key: (name: string) => boolean
  gamepadConnected: (index: number) => boolean
  gamepadAxis: (index: number, axis: number) => number
  gamepadButton: (index: number, button: number) => number
  x: number
  y: number
  down: boolean
}

/** Carrega o bridge num escopo controlado e devolve __szInput + disparadores. */
function load(
  opts: {
    canvas?: unknown
    gamepads?: unknown[]
    onGamepadQuery?: () => void
    onQuery?: () => void
    runtime?: string
  } = {},
) {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const options: Record<string, unknown> = {}
  const sent: Array<{ message: unknown; targetOrigin: string }> = []
  const dispatched: Array<{ type: string; key?: string; code?: string }> = []
  class FakeAudio {
    muted = false
  }
  class FakeKeyboardEvent {
    type: string
    key?: string
    code?: string

    constructor(type: string, init: { key?: string; code?: string }) {
      this.type = type
      this.key = init.key
      this.code = init.code
    }
  }
  const parent = {
    postMessage(message: unknown, targetOrigin: string) {
      sent.push({ message, targetOrigin })
    },
  }
  const win = {
    addEventListener(name: string, fn: Listener, opt?: unknown) {
      listeners[name] ??= []
      listeners[name].push(fn)
      if (opt !== undefined) options[name] = opt
    },
    dispatchEvent(event: { type: string; key?: string; code?: string }) {
      dispatched.push(event)
    },
    document: {
      querySelector: () => {
        opts.onQuery?.()
        return opts.canvas ?? null
      },
    },
    Audio: FakeAudio,
    navigator: {
      getGamepads: () => {
        opts.onGamepadQuery?.()
        return opts.gamepads ?? []
      },
    },
    parent,
    __szInput: undefined,
  } as unknown as Record<string, unknown>
  // O bridge usa `window`, `document` (globais). Passamos como argumentos.
  new Function('window', 'document', 'KeyboardEvent', opts.runtime ?? buildInputBridgeRuntime())(
    win,
    win.document,
    FakeKeyboardEvent,
  )
  const fire = (name: string, ev: unknown) => {
    for (const fn of listeners[name] ?? []) fn(ev)
  }
  return {
    input: (win as { __szInput: InputApi }).__szInput,
    fire,
    options,
    parent,
    sent,
    dispatched,
    createAudio: () => new (win.Audio as typeof FakeAudio)(),
  }
}

describe('inputBridge — window.__szInput', () => {
  it('o runtime de produção mantém a entrada e exclui controles exclusivos do preview', () => {
    const runtime = buildInputRuntime()
    const { input, fire } = load({ runtime })
    fire('keydown', { key: 'ArrowRight', code: 'ArrowRight' })
    expect(input.key('ArrowRight')).toBe(true)
    expect(runtime).not.toContain('sz:screenshot')
    expect(runtime).not.toContain('sz:audio')
  })

  it('key() é true enquanto a tecla está apertada e false após soltar', () => {
    const { input, fire } = load()
    expect(input.key('ArrowRight')).toBe(false)
    fire('keydown', { key: 'ArrowRight', code: 'ArrowRight' })
    expect(input.key('ArrowRight')).toBe(true)
    fire('keyup', { key: 'ArrowRight', code: 'ArrowRight' })
    expect(input.key('ArrowRight')).toBe(false)
  })

  it('barra de espaço casa com "Space" e " "', () => {
    const { input, fire } = load()
    fire('keydown', { key: ' ', code: 'Space' })
    expect(input.key('Space')).toBe(true)
  })

  it('lê gamepad físico com deadzone, normalização e limites seguros', () => {
    const { input } = load({
      gamepads: [
        {
          connected: true,
          axes: [0.1, -0.575, 2, Number.NaN],
          buttons: [{ value: 0.75 }, 2, { value: Number.NaN }],
        },
      ],
    })

    expect(input.gamepadConnected(0)).toBe(true)
    expect(input.gamepadAxis(0, 0)).toBe(0)
    expect(input.gamepadAxis(0, 1)).toBeCloseTo(-0.5, 5)
    expect(input.gamepadAxis(0, 2)).toBe(1)
    expect(input.gamepadAxis(0, 3)).toBe(0)
    expect(input.gamepadButton(0, 0)).toBe(0.75)
    expect(input.gamepadButton(0, 1)).toBe(1)
    expect(input.gamepadButton(0, 2)).toBe(0)
    expect(input.gamepadButton(99, 0)).toBe(0)
  })

  it('consulta o navegador uma vez para todas as leituras do mesmo frame', () => {
    let queries = 0
    const { input } = load({
      gamepads: [{ connected: true, axes: [0.5], buttons: [{ value: 1 }] }],
      onGamepadQuery: () => {
        queries += 1
      },
    })

    input.gamepadConnected(0)
    input.gamepadAxis(0, 0)
    input.gamepadButton(0, 0)

    expect(queries).toBe(1)
  })

  it('atualiza x/y do ponteiro no pointermove', () => {
    const { input, fire } = load()
    fire('pointermove', { clientX: 42, clientY: 17 })
    expect(input.x).toBe(42)
    expect(input.y).toBe(17)
  })

  it('usa a tela onde o evento aconteceu quando há mais de um Canvas', () => {
    const first = {
      isConnected: true,
      getContext: () => ({}),
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      }),
      width: 100,
      height: 100,
    }
    const second = {
      isConnected: true,
      getContext: () => ({}),
      getBoundingClientRect: () => ({
        left: 200,
        top: 50,
        width: 200,
        height: 100,
      }),
      width: 400,
      height: 200,
    }
    const { input, fire } = load({ canvas: first })

    fire('pointermove', { clientX: 250, clientY: 75, target: second })

    expect(input.x).toBe(100)
    expect(input.y).toBe(50)
  })

  it('limpa as teclas apertadas no blur (corrige tecla presa após alt-tab)', () => {
    const { input, fire } = load()
    fire('keydown', { key: 'ArrowLeft', code: 'ArrowLeft' })
    expect(input.key('ArrowLeft')).toBe(true)
    fire('blur', {})
    // Sem o keyup (que o navegador às vezes engole no alt-tab), a tecla ficaria
    // "presa"; o blur zera o mapa.
    expect(input.key('ArrowLeft')).toBe(false)
  })

  it('cacheia o canvas: não re-consulta o DOM a cada pointermove', () => {
    let queries = 0
    const canvas = {
      isConnected: true,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      width: 0,
      height: 0,
    }
    const { fire } = load({ canvas, onQuery: () => queries++ })
    fire('pointermove', { clientX: 1, clientY: 1 })
    fire('pointermove', { clientX: 2, clientY: 2 })
    fire('pointermove', { clientX: 3, clientY: 3 })
    // Uma única consulta ao DOM mesmo com vários moves (canvas conectado em cache).
    expect(queries).toBe(1)
  })

  it('re-consulta o canvas quando o anterior foi removido da página (isConnected=false)', () => {
    let queries = 0
    const canvas = {
      isConnected: false,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      width: 0,
      height: 0,
    }
    const { fire } = load({ canvas, onQuery: () => queries++ })
    fire('pointermove', { clientX: 1, clientY: 1 })
    fire('pointermove', { clientX: 2, clientY: 2 })
    // Canvas desconectado → re-busca a cada move (não fica preso num elemento morto).
    expect(queries).toBe(2)
  })

  it('registra os listeners de ponteiro como passivos (hot-path mais leve)', () => {
    const { options } = load()
    expect((options.pointermove as { passive?: boolean })?.passive).toBe(true)
    expect((options.pointerdown as { passive?: boolean })?.passive).toBe(true)
    expect((options.pointerup as { passive?: boolean })?.passive).toBe(true)
  })

  it('ignora screenshot pedido por um subframe e responde somente ao parent autenticado', () => {
    const canvas = {
      isConnected: true,
      toDataURL: () => 'data:image/png;base64,SEGREDO',
    }
    const { fire, parent, sent } = load({ canvas })
    const attackerSent: unknown[] = []

    fire('message', {
      data: { type: 'sz:screenshot' },
      source: { postMessage: (message: unknown) => attackerSent.push(message) },
      origin: 'https://atacante.invalid',
    })
    expect(attackerSent).toEqual([])
    expect(sent).toEqual([])

    fire('message', {
      data: { type: 'sz:screenshot' },
      source: parent,
      origin: 'https://comunidade.sistemazero.com.br',
    })
    expect(sent).toEqual([
      {
        message: {
          type: 'sz:screenshot:result',
          dataUrl: 'data:image/png;base64,SEGREDO',
        },
        targetOrigin: 'https://comunidade.sistemazero.com.br',
      },
    ])
  })

  it('aceita gamepad e áudio somente quando a mensagem vem do parent', () => {
    const { createAudio, dispatched, fire, parent } = load()
    const audio = createAudio()
    const attacker = {}

    fire('message', {
      data: { type: 'sz:gamepad', action: 'keydown', key: 'ArrowRight' },
      source: attacker,
      origin: 'https://atacante.invalid',
    })
    fire('message', {
      data: { type: 'sz:audio', muted: true },
      source: attacker,
      origin: 'https://atacante.invalid',
    })
    expect(dispatched).toEqual([])
    expect(audio.muted).toBe(false)

    fire('message', {
      data: { type: 'sz:gamepad', action: 'keydown', key: 'ArrowRight' },
      source: parent,
      origin: 'https://comunidade.sistemazero.com.br',
    })
    fire('message', {
      data: { type: 'sz:audio', muted: true },
      source: parent,
      origin: 'https://comunidade.sistemazero.com.br',
    })
    expect(dispatched).toEqual([{ type: 'keydown', key: 'ArrowRight', code: 'ArrowRight' }])
    expect(audio.muted).toBe(true)
  })
})
