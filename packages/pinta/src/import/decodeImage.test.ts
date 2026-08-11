import { describe, expect, it } from 'bun:test'
import { decodeImageFile, IMPORT_ACCEPT } from './decodeImage'

describe('decodeImageFile', () => {
  it('expõe somente os formatos aceitos e rejeita outros antes de decodificar', async () => {
    expect(IMPORT_ACCEPT).toBe('image/png,image/jpeg,image/webp')
    expect(await decodeImageFile(new File(['x'], 'x.gif', { type: 'image/gif' }))).toBeNull()
  })

  it('limita a imagem proporcionalmente e sempre fecha o ImageBitmap', async () => {
    const contextDescriptor = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      'getContext',
    )
    const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
    const drawCalls: unknown[][] = []
    let closed = 0
    const source = {
      width: 4096,
      height: 2,
      close: () => {
        closed += 1
      },
    } as ImageBitmap
    const context = {
      imageSmoothingEnabled: false,
      drawImage: (...args: unknown[]) => drawCalls.push(args),
      getImageData: (_x: number, _y: number, width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
    }
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => context,
    })
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: async () => source,
    })

    try {
      const decoded = await decodeImageFile(new File(['x'], 'x.png', { type: 'image/png' }))
      expect(decoded?.width).toBe(2048)
      expect(decoded?.height).toBe(1)
      expect(decoded?.data).toHaveLength(2048 * 4)
      expect(drawCalls[0]?.slice(1)).toEqual([0, 0, 2048, 1])
      expect(context.imageSmoothingEnabled).toBe(true)
      expect(closed).toBe(1)
    } finally {
      if (contextDescriptor) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', contextDescriptor)
      }
      if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor)
      else Reflect.deleteProperty(globalThis, 'createImageBitmap')
    }
  })

  it('fecha o ImageBitmap mesmo quando o canvas falha', async () => {
    const contextDescriptor = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      'getContext',
    )
    const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
    let closed = 0
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        imageSmoothingEnabled: false,
        drawImage: () => {
          throw new Error('canvas indisponível')
        },
      }),
    })
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: async () =>
        ({ width: 10, height: 10, close: () => (closed += 1) }) as unknown as ImageBitmap,
    })

    try {
      expect(await decodeImageFile(new File(['x'], 'x.webp', { type: 'image/webp' }))).toBeNull()
      expect(closed).toBe(1)
    } finally {
      if (contextDescriptor) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', contextDescriptor)
      }
      if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor)
      else Reflect.deleteProperty(globalThis, 'createImageBitmap')
    }
  })
})
