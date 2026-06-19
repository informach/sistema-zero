import { describe, expect, it } from 'bun:test'
import { buildInputBridgeRuntime } from '../inputBridge'

interface InputApi {
  key: (name: string) => boolean
  x: number
  y: number
  down: boolean
}

/** Carrega o bridge num escopo controlado e devolve __szInput + disparadores. */
function load() {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    document: { querySelector: () => null },
    __szInput: undefined,
  } as unknown as Record<string, unknown>
  // O bridge usa `window`, `document` (globais). Passamos como argumentos.
  new Function('window', 'document', buildInputBridgeRuntime())(win, win.document)
  const fire = (name: string, ev: unknown) => {
    for (const fn of listeners[name] ?? []) fn(ev)
  }
  return { input: (win as { __szInput: InputApi }).__szInput, fire }
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
})
