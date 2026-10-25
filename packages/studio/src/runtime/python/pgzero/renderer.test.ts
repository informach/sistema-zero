import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { PGZERO_KEY_CODES, PGZERO_KEY_MODS } from './keyCodes.generated'
import { PGZERO_LIMITS, PGZERO_LIST_ATTACHMENT, PGZERO_OP } from './protocol'
import { createPgzeroRenderer } from './renderer'

// happy-dom has no 2D canvas: a context that accepts every call stands in. Painting itself
// is covered by the runtime E2E in Chrome; these tests cover the exchange contract. Each
// character measures 10 px, and what the screen draws is recorded.
const drawn: { canvas: unknown; x: number; y: number }[] = []
let screenFills = 0
const context = function (this: unknown) {
  return new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'getImageData'
          ? (_x: number, _y: number, w: number, h: number) => ({
              data: new Uint8ClampedArray(w * h * 4).fill(9),
            })
          : key === 'measureText'
            ? (text: string) => ({
                width: text.length * 10,
                fontBoundingBoxAscent: 8,
                fontBoundingBoxDescent: 2,
              })
            : key === 'drawImage' && this instanceof HTMLCanvasElement
              ? (canvas: unknown, x: number, y: number) => drawn.push({ canvas, x, y })
              : key === 'fillRect' && this instanceof HTMLCanvasElement
                ? () => {
                    screenFills++
                  }
                : () => {},
      set: () => true,
    },
  )
}
class FakeOffscreenCanvas {
  constructor(
    public width: number,
    public height: number,
  ) {}
  getContext() {
    return context.call(this)
  }
}
const saved = {
  offscreen: Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas'),
  getContext: HTMLCanvasElement.prototype.getContext,
  decode: HTMLImageElement.prototype.decode,
}
beforeAll(() => {
  Object.defineProperty(globalThis, 'OffscreenCanvas', {
    configurable: true,
    value: FakeOffscreenCanvas,
  })
  HTMLCanvasElement.prototype.getContext = context as never
  HTMLImageElement.prototype.decode = () => Promise.resolve()
})
afterAll(() => {
  if (saved.offscreen) Object.defineProperty(globalThis, 'OffscreenCanvas', saved.offscreen)
  else Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
  HTMLCanvasElement.prototype.getContext = saved.getContext
  HTMLImageElement.prototype.decode = saved.decode
})

const header = (change: Record<string, unknown> = {}) =>
  JSON.stringify({
    w: 64,
    h: 48,
    title: 'Jogo',
    keep: false,
    images: [],
    fonts: [],
    strings: [],
    styles: [],
    audio: [],
    ...change,
  })
const list = (...ops: number[]) => ({
  id: PGZERO_LIST_ATTACHMENT,
  bytes: new Uint8Array(new Float64Array(ops).buffer),
})

describe('Pygame Zero renderer exchange', () => {
  test('the screen keeps what was drawn: a batch paints on top, only a new size wipes it', async () => {
    const renderer = createPgzeroRenderer(document.createElement('div'))
    try {
      screenFills = 0
      await renderer.exchange(header(), [list(PGZERO_OP.FILL, 1, 2, 3, 255)])
      // The new window starts black; the reply comes back before the display frame.
      expect(screenFills).toBe(1)
      await renderer.exchange(header({ keep: true }), [])
      // The previous batch reached the screen first: the game's fill.
      expect(screenFills).toBe(2)
      await renderer.exchange(header(), [list(PGZERO_OP.FILL, 4, 5, 6, 255)])
      expect(screenFills).toBe(2)
      await renderer.exchange(header({ w: 80, keep: true }), [])
      // Nothing wiped the screen before that batch (only its own fill), then the new size.
      expect(screenFills).toBe(4)
    } finally {
      renderer.dispose()
    }
  })

  test('a screen read paints what was drawn at once and answers the colour there', async () => {
    const renderer = createPgzeroRenderer(document.createElement('div'))
    try {
      await renderer.exchange(header(), [list()])
      const triangle = list(PGZERO_OP.POLY, 3, 0, 255, 0, 0, 255, 0, 0, 10, 0, 5, 8)
      const reply = await renderer.exchange(header({ read: [5, 5] }), [triangle])
      // The fake canvas answers 9 for every channel.
      expect(JSON.parse(reply as string)).toEqual({ pixel: [9, 9, 9, 9] })
      // A polygon needs 3 points: the paint fails, and the next exchange reports it.
      await renderer.exchange(header(), [list(PGZERO_OP.POLY, 2, 0, 1, 1, 1, 255, 0, 0, 1, 1)])
      const bad = await renderer.exchange(header({ keep: true }), [])
      expect(JSON.parse(bad as string).error).toBeDefined()
    } finally {
      renderer.dispose()
    }
  })

  test('a frame the browser cannot show comes back as an error reply for Python', async () => {
    const renderer = createPgzeroRenderer(document.createElement('div'))
    try {
      const reply = await renderer.exchange(header({ w: 0 }), [list()])
      expect(JSON.parse(reply as string)).toEqual({
        error: 'Quadro do Pygame Zero inválido ou acima do limite.',
      })
      const missing = await renderer.exchange(header({ images: [[1, '/p/images/a.png', 2, 2]] }), [
        list(),
      ])
      expect(JSON.parse(missing as string).error).toContain('/p/images/a.png')
    } finally {
      renderer.dispose()
    }
  })

  test('the pixels of a vector image come back as bytes, with the image they need', async () => {
    const renderer = createPgzeroRenderer(document.createElement('div'))
    try {
      const svg = new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="2"></svg>',
      ) as Uint8Array<ArrayBuffer>
      const reply = await renderer.exchange(
        header({ keep: true, images: [[1, '/p/images/nave.svg', 3, 2]], decode: 1 }),
        [{ id: 1, bytes: svg }],
      )
      expect(typeof reply).toBe('object')
      const { text, bytes } = reply as { text: string; bytes: Uint8Array }
      expect(text).toBe('{}')
      expect(bytes.byteLength).toBe(3 * 2 * 4)
    } finally {
      renderer.dispose()
    }
  })

  test('Ctrl reaches the game, and losing focus releases it with a key-up', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const renderer = createPgzeroRenderer(host)
    try {
      await renderer.exchange(header(), [list()])
      const down = new KeyboardEvent('keydown', {
        key: 'Control',
        code: 'ControlLeft',
        ctrlKey: true,
        cancelable: true,
      })
      window.dispatchEvent(down)
      // The browser keeps its shortcuts while Ctrl is held.
      expect(down.defaultPrevented).toBe(false)
      const pressed = JSON.parse((await renderer.exchange(header(), [list()])) as string)
      expect(pressed.events).toEqual([
        ['kd', PGZERO_KEY_CODES.ControlLeft, PGZERO_KEY_MODS.ctrl, ''],
      ])
      window.dispatchEvent(new Event('blur'))
      const released = JSON.parse((await renderer.exchange(header(), [list()])) as string)
      expect(released.events).toEqual([['ku', PGZERO_KEY_CODES.ControlLeft, 0]])
    } finally {
      renderer.dispose()
      host.remove()
    }
  })

  test('the right Shift has its own bit, like pygame (RSHIFT, not LSHIFT)', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const renderer = createPgzeroRenderer(host)
    try {
      await renderer.exchange(header(), [list()])
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftRight', shiftKey: true }),
      )
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', code: 'KeyA', shiftKey: true }))
      const events = JSON.parse((await renderer.exchange(header(), [list()])) as string)
        .events as unknown[][]
      expect(events.map((event) => event[2])).toEqual([
        PGZERO_KEY_MODS.shift * 2,
        PGZERO_KEY_MODS.shift * 2,
      ])
    } finally {
      renderer.dispose()
      host.remove()
    }
  })

  test('two mouse buttons pressed together never stay held, and a cancelled pointer releases', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const renderer = createPgzeroRenderer(host)
    try {
      await renderer.exchange(header(), [list()])
      const canvas = host.querySelector('canvas')!
      canvas.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 64, height: 48, right: 64, bottom: 48 }) as DOMRect
      const pointer = (type: string, button: number, buttons: number) =>
        canvas.dispatchEvent(
          new PointerEvent(type, { button, buttons, clientX: 10, clientY: 20, cancelable: true }),
        )
      const buttons = async () =>
        (JSON.parse((await renderer.exchange(header(), [list()])) as string).events as unknown[][])
          .filter((event) => event[0] === 'md' || event[0] === 'mu')
          .map((event) => String(event[0]) + String(event[3]))
      // Left down, right down (a move), left up (a move), right up.
      pointer('pointerdown', 0, 1)
      pointer('pointermove', -1, 3)
      pointer('pointermove', -1, 2)
      pointer('pointerup', 2, 0)
      expect(await buttons()).toEqual(['md1', 'md3', 'mu1', 'mu3'])
      pointer('pointerdown', 0, 1)
      pointer('pointercancel', 0, 0)
      expect(await buttons()).toEqual(['md1', 'mu1'])
      pointer('pointerdown', 0, 1)
      pointer('lostpointercapture', 0, 1)
      expect(await buttons()).toEqual(['md1', 'mu1'])
      pointer('pointerdown', 2, 2)
      window.dispatchEvent(new Event('blur'))
      expect(await buttons()).toEqual(['md3', 'mu3'])
    } finally {
      renderer.dispose()
      host.remove()
    }
  })

  test('Ctrl+arrow belongs to the game; Ctrl+R and the system key + S still reach the browser', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const renderer = createPgzeroRenderer(host)
    try {
      await renderer.exchange(header(), [list()])
      const press = (code: string, key: string, modifiers: KeyboardEventInit) => {
        const event = new KeyboardEvent('keydown', { code, key, cancelable: true, ...modifiers })
        window.dispatchEvent(event)
        return event.defaultPrevented
      }
      expect(press('ArrowLeft', 'ArrowLeft', { ctrlKey: true })).toBe(true)
      expect(press('Space', ' ', { ctrlKey: true })).toBe(true)
      expect(press('KeyR', 'r', { ctrlKey: true })).toBe(false)
      expect(press('KeyS', 's', { metaKey: true })).toBe(false)
    } finally {
      renderer.dispose()
      host.remove()
    }
  })

  test('a line longer than a canvas can be is drawn around its anchor, at its true place', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const renderer = createPgzeroRenderer(host)
    try {
      // 4000 characters of 10 px: a 40 000 px line (the most Python lets a text have).
      const strings = [[1, 'a'.repeat(4000)]]
      const styles = [[1, { fontsize: 24 }]]
      for (const [hanchor, anchorX] of [
        [0, 0],
        [1, 64],
      ] as const) {
        drawn.length = 0
        const reply = await renderer.exchange(header({ strings, styles }), [
          list(PGZERO_OP.TEXT, 1, 1, anchorX, 0, hanchor, 0),
        ])
        expect(JSON.parse(reply as string).error).toBeUndefined()
        // The batch reaches the screen on its display frame, before the next exchange.
        await renderer.exchange(header({ keep: true }), [])
        expect(drawn).toHaveLength(1)
        const { canvas, x } = drawn[0]! as { canvas: FakeOffscreenCanvas; x: number }
        expect(canvas.width).toBeLessThanOrEqual(PGZERO_LIMITS.textWidth)
        // topleft: its start at the anchor; topright: its end at the anchor.
        expect(hanchor ? x + canvas.width : x).toBe(anchorX)
      }
    } finally {
      renderer.dispose()
      host.remove()
    }
  })

  test('a textbox with outline and shadow draws at the size it picks', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const renderer = createPgzeroRenderer(host)
    try {
      // Valid for Python at the default size; textbox grows the letters to 256.
      const styles = [[1, { width: 300, fit: 200, owidth: 4, shadow: [5, 5] }]]
      drawn.length = 0
      const reply = await renderer.exchange(header({ strings: [[1, 'oi']], styles }), [
        list(PGZERO_OP.TEXT, 1, 1, 0, 0, 0, 0),
      ])
      expect(JSON.parse(reply as string).error).toBeUndefined()
      // The batch reaches the screen on its display frame, before the next exchange.
      await renderer.exchange(header({ keep: true }), [])
      expect(drawn).toHaveLength(1)
    } finally {
      renderer.dispose()
      host.remove()
    }
  })

  test('ended sounds reach Python with the frame, and the host is asked to watch', async () => {
    const watched: boolean[] = []
    const ended = [5, 6]
    const renderer = createPgzeroRenderer(document.createElement('div'), {
      onAudio: (_commands, watch) => watched.push(watch),
      takeEndedVoices: (limit) => ended.splice(0, limit),
    })
    try {
      const reply = JSON.parse(
        (await renderer.exchange(header({ watch: true }), [list()])) as string,
      )
      expect(reply.ended).toEqual([5, 6])
      expect(watched).toEqual([true])
    } finally {
      renderer.dispose()
    }
  })
})
