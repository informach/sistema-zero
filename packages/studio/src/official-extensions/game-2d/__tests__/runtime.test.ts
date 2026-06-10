import { beforeEach, describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

interface SZGame2DSurface {
  SZGame2D: {
    createSprite: (
      opts: Partial<{ x: number; y: number; w: number; h: number; color: string }>,
    ) => {
      x: number
      y: number
      w: number
      h: number
      color: string
      vx: number
      vy: number
    }
    isColliding: (a: unknown, b: unknown) => boolean
    drawSprite: (ctx: unknown, sprite: unknown) => void
    moveByKeys: (sprite: { x: number; y: number }, speed?: number) => void
    keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  }
}

function loadRuntime(): SZGame2DSurface {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  const requestAnimationFrame = () => 0
  // Executa o runtime num escopo controlado, com `window` e
  // `requestAnimationFrame` como argumentos. O runtime define
  // `window.SZGame2D` que depois lemos.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, requestAnimationFrame)
  return win as unknown as SZGame2DSurface
}

describe('gameTwoDRuntime', () => {
  let api: SZGame2DSurface['SZGame2D']
  beforeEach(() => {
    api = loadRuntime().SZGame2D
  })

  it('createSprite preenche defaults', () => {
    const s = api.createSprite({ x: 5, y: 10 })
    expect(s.x).toBe(5)
    expect(s.y).toBe(10)
    expect(s.w).toBe(32)
    expect(s.color).toBe('#22d3ee')
    expect(s.vx).toBe(0)
  })

  it('isColliding detecta sobreposição AABB', () => {
    const a = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const b = api.createSprite({ x: 5, y: 5, w: 10, h: 10 })
    const c = api.createSprite({ x: 100, y: 100, w: 10, h: 10 })
    expect(api.isColliding(a, b)).toBe(true)
    expect(api.isColliding(a, c)).toBe(false)
  })

  it('moveByKeys altera coordenadas conforme keys', () => {
    const s = api.createSprite({ x: 100, y: 100 })
    api.keys.right = true
    api.moveByKeys(s, 5)
    expect(s.x).toBe(105)
    api.keys.right = false
    api.keys.up = true
    api.moveByKeys(s, 5)
    expect(s.y).toBe(95)
  })
})

describe('gameTwoDRuntime.gameLoop', () => {
  // Loader com requestAnimationFrame controlável: cada frame agendado fica numa
  // fila e só roda quando chamamos flushFrame() manualmente.
  function loadWithFrameControl() {
    const frames: Array<() => void> = []
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    let nextId = 1
    const requestAnimationFrame = (cb: () => void) => {
      frames.push(cb)
      return nextId++
    }
    const canceledIds = new Set<number>()
    const cancelAnimationFrame = (id: number) => canceledIds.add(id)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
      win,
      requestAnimationFrame,
      cancelAnimationFrame,
    )
    const api = (win as unknown as { SZGame2D: { gameLoop: (fn: () => void) => () => void } })
      .SZGame2D
    const flushFrame = () => {
      const cb = frames.shift()
      cb?.()
    }
    return { api, flushFrame }
  }

  it('devolve uma função que para o loop', () => {
    const { api, flushFrame } = loadWithFrameControl()
    let count = 0
    const stop = api.gameLoop(() => {
      count += 1
    })
    expect(typeof stop).toBe('function')

    flushFrame() // frame 1 → roda fn e reagenda
    flushFrame() // frame 2 → roda fn e reagenda
    expect(count).toBe(2)

    stop()
    flushFrame() // frame agendado pelo último tick não deve mais rodar fn
    expect(count).toBe(2)
  })

  it('isola erros da fn sem interromper o loop', () => {
    const { api, flushFrame } = loadWithFrameControl()
    let count = 0
    api.gameLoop(() => {
      count += 1
      throw new Error('boom')
    })
    expect(() => {
      flushFrame()
      flushFrame()
    }).not.toThrow()
    expect(count).toBe(2)
  })
})
