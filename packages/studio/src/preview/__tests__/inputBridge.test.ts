import { describe, expect, it } from 'bun:test'
import { buildInputBridgeRuntime } from '../inputBridge'

interface InputApi {
  key: (name: string) => boolean
  x: number
  y: number
  down: boolean
}

/** Carrega o bridge num escopo controlado e devolve __szInput + disparadores. */
function load(opts: { canvas?: unknown; onQuery?: () => void } = {}) {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const options: Record<string, unknown> = {}
  const win = {
    addEventListener(name: string, fn: Listener, opt?: unknown) {
      listeners[name] ??= []
      listeners[name].push(fn)
      if (opt !== undefined) options[name] = opt
    },
    document: {
      querySelector: () => {
        opts.onQuery?.()
        return opts.canvas ?? null
      },
    },
    __szInput: undefined,
  } as unknown as Record<string, unknown>
  // O bridge usa `window`, `document` (globais). Passamos como argumentos.
  new Function('window', 'document', buildInputBridgeRuntime())(win, win.document)
  const fire = (name: string, ev: unknown) => {
    for (const fn of listeners[name] ?? []) fn(ev)
  }
  return { input: (win as { __szInput: InputApi }).__szInput, fire, options }
}

describe('inputBridge — window.__szInput', () => {
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
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      width: 100,
      height: 100,
    }
    const second = {
      isConnected: true,
      getContext: () => ({}),
      getBoundingClientRect: () => ({ left: 200, top: 50, width: 200, height: 100 }),
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
})
