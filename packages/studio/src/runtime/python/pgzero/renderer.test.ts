import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { PGZERO_KEY_CODES, PGZERO_KEY_MODS } from './keyCodes.generated'
import { PGZERO_LIST_ATTACHMENT } from './protocol'
import { createPgzeroRenderer } from './renderer'

// happy-dom has no 2D canvas: a context that accepts every call stands in. Painting itself
// is covered by the runtime E2E in Chrome; these tests cover the exchange contract.
const context = () =>
  new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'getImageData'
          ? (_x: number, _y: number, w: number, h: number) => ({
              data: new Uint8ClampedArray(w * h * 4).fill(9),
            })
          : key === 'measureText'
            ? () => ({ width: 10, fontBoundingBoxAscent: 8, fontBoundingBoxDescent: 2 })
            : () => {},
      set: () => true,
    },
  )
class FakeOffscreenCanvas {
  constructor(
    public width: number,
    public height: number,
  ) {}
  getContext() {
    return context()
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
const list = () => ({ id: PGZERO_LIST_ATTACHMENT, bytes: new Uint8Array(0) })

describe('Pygame Zero renderer exchange', () => {
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
