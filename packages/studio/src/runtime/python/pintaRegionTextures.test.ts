import { expect, test } from 'bun:test'
import type { PintaTextureLoad } from './pintaRegionProtocol'
import { createPintaTextureStore } from './pintaRegionTextures'

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/1sAAAAASUVORK5CYII=',
    'base64',
  ),
)
const single: PintaTextureLoad = { images: [[1, 1, png.length]], bytes: png.length, pixels: 1 }
const pair: PintaTextureLoad = {
  images: [...single.images, ...single.images],
  bytes: png.length * 2,
  pixels: 2,
}
const pairBytes = Uint8Array.from([...png, ...png])

class Bitmap implements ImageBitmap {
  readonly width = 1
  readonly height = 1
  closed = 0

  close() {
    this.closed++
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('closing a renderer releases admitted and staged resources and rejects late bitmap delivery', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
  const active = new Bitmap()
  const staged = new Bitmap()
  const late = new Bitmap()
  const lastDecode = deferred<Bitmap>()
  const waiting = deferred<void>()
  const queue = [active, staged]
  // Only control the browser promise's timing. The real decoder and compositor are covered
  // by the browser tests, including the corrupt late IDAT and visible affine pixels.
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value() {
      const next = queue.shift()
      if (next) return Promise.resolve(next)
      waiting.resolve()
      return lastDecode.promise
    },
  })
  try {
    const store = createPintaTextureStore({
      maxPixels: 4,
      maxImages: 4,
      existing: () => ({ images: 0, pixels: 0 }),
      create: (bitmap) => bitmap,
      release: (bitmap) => bitmap.close(),
    })
    const owner = await store.load(single, png)
    const candidate = store.load(pair, pairBytes)
    await waiting.promise
    expect(store.image(owner, 0)).toBe(active)
    expect(() => store.image(owner + 1, 0)).toThrow()
    expect(store.count).toBe(1)
    store.dispose()
    expect([active.closed, staged.closed, late.closed]).toEqual([1, 1, 0])
    await expect(store.load(single, png)).rejects.toThrow('encerrada')
    lastDecode.resolve(late)
    await expect(candidate).rejects.toThrow('encerrada')
    expect([active.closed, staged.closed, late.closed]).toEqual([1, 1, 1])
    expect(store.count).toBe(0)
    expect(store.pixels).toBe(0)
    expect(() => store.image(owner, 0)).toThrow()
  } finally {
    if (original) Object.defineProperty(globalThis, 'createImageBitmap', original)
    else Reflect.deleteProperty(globalThis, 'createImageBitmap')
  }
})
