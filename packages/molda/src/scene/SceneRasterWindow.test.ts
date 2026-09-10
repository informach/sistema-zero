import { expect, test } from 'bun:test'
import type { ScenePixelRegion } from './composite'
import { SceneRasterWindow } from './SceneRasterWindow'

const size = { width: 4, height: 4 }
const left = { x0: 0, y0: 2, x1: 1, y1: 3 }
const right = { x0: 2, y0: 2, x1: 3, y1: 3 }
const pixels = () => Uint8Array.from({ length: 64 }, (_, i) => (i % 4 === 3 ? 255 : i))
function crop(bytes: Uint8Array, region: ScenePixelRegion) {
  const result = []
  for (let y = region.y0; y <= region.y1; y++)
    for (let x = region.x0; x <= region.x1; x++)
      result.push(...bytes.slice((y * 4 + x) * 4, (y * 4 + x + 1) * 4))
  return new Uint8Array(result)
}

test('raster windows alias static derived pixels and reuse a single frame buffer through switches', () => {
  const view = new SceneRasterWindow()
  const source = pixels()
  expect(view.update({ ...size, pixels: source })).toBe('all')
  expect(view.raster!.pixels).toBe(source)
  expect(view.update(null)).toBeNull()
  expect(view.update(null, left)).toBe('all')
  const frame = view.raster!.pixels
  expect(frame).not.toBe(source)
  expect(frame).toEqual(crop(source, left))
  expect(view.update(null, { ...left })).toBeNull()
  expect(view.update(null, right)).toBe('all')
  expect(view.raster!.pixels).toBe(frame)
  expect(frame).toEqual(crop(source, right))
  expect(view.update(null)).toBe('all')
  expect(view.raster!.pixels).toBe(source)
  const next = pixels().fill(255)
  view.update({ ...size, pixels: next })
  expect(view.raster!.pixels).toBe(source)
  expect(source).toEqual(next)
  view.clear()
  expect(view.raster).toBeNull()
  expect(view.transparent).toBe(false)
  expect(() => view.update(null)).toThrow()
})

test('off-frame edits update the retained sheet without visible upload and transparency remains sheet-wide', () => {
  const view = new SceneRasterWindow()
  const source = pixels()
  view.update({ ...size, pixels: source }, left)
  const before = view.raster!.pixels.slice()
  expect(
    view.update(
      { ...size, pixels: new Uint8Array([8, 7, 6, 0]), region: { x0: 3, y0: 3, x1: 3, y1: 3 } },
      left,
    ),
  ).toBeNull()
  expect(view.raster!.pixels).toEqual(before)
  expect(view.transparent).toBe(true)
  view.update(null, right)
  expect(view.raster!.pixels.slice(12)).toEqual(new Uint8Array([8, 7, 6, 0]))
  expect(
    view.update(
      { ...size, pixels: new Uint8Array([1, 2, 3, 255]), region: { x0: 3, y0: 3, x1: 3, y1: 3 } },
      right,
    ),
  ).toEqual({ x0: 1, y0: 1, x1: 1, y1: 1 })
  expect(view.transparent).toBe(false)
})

test('partial updates crossing a window boundary match a full reference crop for every small rectangle', () => {
  for (let y0 = 0; y0 < 4; y0++)
    for (let y1 = y0; y1 < 4; y1++)
      for (let x0 = 0; x0 < 4; x0++)
        for (let x1 = x0; x1 < 4; x1++) {
          const view = new SceneRasterWindow()
          const source = pixels()
          const expected = source.slice()
          const region = { x0, y0, x1, y1 }
          const patch = new Uint8Array((x1 - x0 + 1) * (y1 - y0 + 1) * 4).fill(37)
          view.update({ ...size, pixels: source }, left)
          view.update({ ...size, pixels: patch, region }, left)
          for (let y = y0; y <= y1; y++)
            for (let x = x0; x <= x1; x++) expected.fill(37, (y * 4 + x) * 4, (y * 4 + x + 1) * 4)
          expect(view.raster!.pixels).toEqual(crop(expected, left))
          view.update(null)
          expect(view.raster!.pixels).toEqual(expected)
        }
})

test('invalid patches/windows are atomic; resize and whole-image refresh keep the crop current', () => {
  const view = new SceneRasterWindow()
  const source = pixels()
  view.update({ ...size, pixels: source }, left)
  const before = view.raster!.pixels.slice()
  for (const update of [
    () => view.update({ ...size, pixels: new Uint8Array(63) }, left),
    () => view.update({ ...size, pixels: new Uint8Array(64) }, { ...left, x1: 4 }),
    () =>
      view.update({
        width: 2,
        height: 2,
        pixels: new Uint8Array(4),
        region: { x0: 0, y0: 0, x1: 0, y1: 0 },
      }),
  ]) {
    expect(update).toThrow()
    expect(view.raster!.pixels).toEqual(before)
    expect(view.transparent).toBe(false)
  }
  const frame = view.raster!.pixels
  view.update({ ...size, pixels: pixels().fill(125) }, left)
  expect(view.raster!.pixels).toBe(frame)
  expect(frame).toEqual(new Uint8Array(16).fill(125))
  const next = { width: 2, height: 2, pixels: new Uint8Array(16).fill(255) }
  expect(view.update(next)).toBe('all')
  expect(view.raster!.pixels).toBe(next.pixels)
  expect(view.transparent).toBe(false)
})
