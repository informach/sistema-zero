import { expect, spyOn, test } from 'bun:test'
import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import type { SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import { SceneImagePreview } from './SceneImagePreview'

test('2D flipbook preview crops canonical cells, skips off-frame writes and restores the full sheet', () => {
  const writes: Array<{ width: number; height: number; pixels: Uint8ClampedArray }> = []
  const boundary = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: (data: ImageData) =>
      writes.push({ width: data.width, height: data.height, pixels: data.data.slice() }),
  })) as unknown as HTMLCanvasElement['getContext'])
  const pixels = Uint8Array.from({ length: 32 }, (_, i) => (i % 4 === 3 ? 255 : i))
  const image: SceneImage = {
    id: 'sheet',
    name: 'Quadros',
    width: 4,
    height: 2,
    encoding: 'rgba',
    layers: [{ id: 'layer', name: 'Camada', visible: true, opacity: 1, pixels }],
    flipbook: { frameWidth: 2, frameHeight: 1, frames: [0, 3, 2], fps: 8, loop: true },
  }
  const element = (source: SceneImage, frame?: number) => (
    <StrictMode>
      <SceneImagePreview image={source} palette={[]} base={[0, 0, 0, 0]} frame={frame} />
    </StrictMode>
  )
  const view = render(element(image, 0))
  try {
    expect(writes).toHaveLength(1)
    expect(writes[0]).toEqual({
      width: 2,
      height: 1,
      pixels: new Uint8ClampedArray(pixels.slice(16, 24)),
    })
    view.rerender(element(image, 3))
    expect(writes.at(-1)!.pixels).toEqual(new Uint8ClampedArray(pixels.slice(8, 16)))
    const nextPixels = pixels.slice()
    nextPixels.set([100, 101, 102, 255], 0)
    const next = { ...image, layers: [{ ...image.layers[0]!, pixels: nextPixels }] }
    view.rerender(element(next, 3))
    expect(writes).toHaveLength(2)
    view.rerender(element(next, 2))
    expect(writes.at(-1)!.pixels).toEqual(new Uint8ClampedArray(nextPixels.slice(0, 8)))
    view.rerender(element(next))
    expect(writes.at(-1)).toEqual({
      width: 4,
      height: 2,
      pixels: new Uint8ClampedArray([...nextPixels.slice(16), ...nextPixels.slice(0, 16)]),
    })
  } finally {
    view.unmount()
    boundary.mockRestore()
  }
})

test('2D preview writes only the changed compact patch at bottom-up UV coordinates and redraws after palette changes', () => {
  const writes: Array<{ width: number; height: number; x: number; y: number; pixels: number[] }> =
    []
  const context = {
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: (data: ImageData, x: number, y: number) => {
      writes.push({ width: data.width, height: data.height, x, y, pixels: [...data.data] })
    },
  }
  const boundary = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => context) as unknown as HTMLCanvasElement['getContext'],
  )
  const image: SceneImage = {
    id: 'image',
    name: 'Imagem',
    width: 4,
    height: 3,
    encoding: 'indexed',
    layers: [
      { id: 'layer', name: 'Camada', visible: true, opacity: 1, pixels: new Uint8Array(12) },
    ],
  }
  const palette: SceneRgba[] = [
    [0, 0, 0, 0],
    [1, 0, 0, 1],
  ]
  const base: SceneRgba = [0, 0, 0, 0]
  const element = (source: SceneImage, colors = palette) => (
    <StrictMode>
      <SceneImagePreview image={source} palette={colors} base={base} />
    </StrictMode>
  )
  const view = render(element(image))
  try {
    expect(writes).toHaveLength(1)
    expect([writes[0]!.width, writes[0]!.height]).toEqual([4, 3])
    const pixels = image.layers[0]!.pixels.slice()
    pixels[1] = 1
    pixels[5] = 1
    const next = { ...image, layers: [{ ...image.layers[0]!, pixels }] }
    view.rerender(element(next))
    expect(writes.at(-1)).toEqual({
      width: 1,
      height: 2,
      x: 1,
      y: 1,
      pixels: [255, 0, 0, 255, 255, 0, 0, 255],
    })
    view.rerender(element(image))
    expect(writes.at(-1)).toEqual({
      width: 1,
      height: 2,
      x: 1,
      y: 1,
      pixels: [0, 0, 0, 0, 0, 0, 0, 0],
    })
    view.rerender(element(next))
    const count = writes.length
    view.rerender(element({ ...next, name: 'Renomeada' }))
    expect(writes.length).toBe(count)
    view.rerender(
      element(next, [
        [0, 0, 0, 0],
        [0, 1, 0, 1],
      ]),
    )
    expect([
      writes.at(-1)!.width,
      writes.at(-1)!.height,
      writes.at(-1)!.x,
      writes.at(-1)!.y,
    ]).toEqual([4, 3, 0, 0])
  } finally {
    view.unmount()
    boundary.mockRestore()
  }
})
