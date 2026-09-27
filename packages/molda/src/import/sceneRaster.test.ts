import { expect, spyOn, test } from 'bun:test'
import { encodePng } from '../export/png'
import { installReferenceImageRuntime } from '../testing/referenceImageRuntime'
import { loadSceneRaster } from './sceneRaster'

const file = (width = 2, height = 3) =>
  new File(
    [new Uint8Array(encodePng(new Uint8Array(width * height * 4), width, height))],
    'imagem.png',
    { type: 'text/plain' },
  )

test('native raster decoder rejects dimensions before creating a decoder or URL', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    await expect(
      loadSceneRaster(file(1025, 1), new AbortController().signal),
    ).rejects.toMatchObject({ reason: 'size' })
    expect(runtime.create).not.toHaveBeenCalled()
    expect(runtime.images).toHaveLength(0)
  } finally {
    runtime.restore()
  }
})

test('raster extraction preserves decoded rectangular pixels, releases its canvas and URL, and accepts oriented JPEG axes', async () => {
  const runtime = installReferenceImageRuntime()
  const bytes = Uint8ClampedArray.from({ length: 24 }, (_, i) => i * 10)
  const calls: unknown[][] = []
  let canvas: HTMLCanvasElement | undefined
  const context = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    canvas = this
    return {
      drawImage: (...args: unknown[]) => calls.push(args),
      getImageData: () => ({ data: bytes }),
    }
  } as unknown as HTMLCanvasElement['getContext'])
  try {
    const pending = loadSceneRaster(file(), new AbortController().signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    runtime.images[0]!.finish(2, 3)
    const result = await pending
    expect(result.raster).toMatchObject({ width: 2, height: 3 })
    expect(result.raster.pixels).toEqual(
      new Uint8Array([...bytes.slice(16), ...bytes.slice(8, 16), ...bytes.slice(0, 8)]),
    )
    expect(calls[0]).toEqual([runtime.images[0], 0, 0])
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    expect(runtime.images[0]!.removed).toBe(true)
    expect(canvas?.width).toBe(0)
    expect(canvas?.height).toBe(0)
    // Header preflight plus browser decoder boundary: JPEG SOF describes 2 x 3; EXIF rotates it.
    const jpeg = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0, 3, 0, 2, 1])],
      'orientada.jpg',
    )
    const rotated = loadSceneRaster(jpeg, new AbortController().signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    runtime.images[1]!.finish(3, 2)
    expect((await rotated).raster).toMatchObject({ width: 3, height: 2 })
  } finally {
    context.mockRestore()
    runtime.restore()
  }
})

test('raster cancellation and unavailable canvas cannot leak URLs or publish decoded pixels', async () => {
  const runtime = installReferenceImageRuntime()
  const context = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
  try {
    const controller = new AbortController(),
      pending = loadSceneRaster(file(), controller.signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    controller.abort()
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    runtime.images[0]!.finish(2, 3)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    const failed = loadSceneRaster(file(), new AbortController().signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    runtime.images[1]!.finish(2, 3)
    await expect(failed).rejects.toMatchObject({ reason: 'decode' })
    expect(runtime.revoke).toHaveBeenCalledTimes(2)
  } finally {
    context.mockRestore()
    runtime.restore()
  }
})
