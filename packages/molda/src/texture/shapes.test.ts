import { expect, test } from 'bun:test'
import type { Texel } from '../paint/skinPaint'
import { makeTexture } from '../testing/fixtures'
import { paintTextureShape, type TextureShape } from './shapes'

const input = (shape: TextureShape, from: Texel, to: Texel, filled = false) => ({
  shape,
  from,
  to,
  filled,
  color: 2,
  brush: 1 as const,
})
const texture = () => {
  const asset = makeTexture({ seamless: false })
  asset.bitmap.data.fill(0)
  return asset
}

test('line, rectangle and filled rectangle paint exact inclusive pixel sets and never mutate their source', () => {
  const asset = texture()
  const before = structuredClone(asset)
  const line = paintTextureShape(asset, input('line', [2, 2], [5, 5]))
  expect(
    [...line.bitmap.data.entries()].filter(([, value]) => value === 2).map(([i]) => i),
  ).toEqual([34, 51, 68, 85])
  for (const filled of [false, true]) {
    const rectangle = paintTextureShape(asset, input('rectangle', [2, 3], [6, 7], filled))
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const inside = x >= 2 && x <= 6 && y >= 3 && y <= 7
        const border = x === 2 || x === 6 || y === 3 || y === 7
        expect(rectangle.bitmap.data[y * 16 + x]).toBe(inside && (filled || border) ? 2 : 0)
      }
    expect(paintTextureShape(asset, input('rectangle', [6, 7], [2, 3], filled))).toEqual(rectangle)
  }
  expect(asset).toEqual(before)
})

test('ellipses are horizontally and vertically symmetric for odd/even bounds, including degenerate sizes', () => {
  for (let width = 0; width <= 8; width++)
    for (let height = 0; height <= 8; height++) {
      const asset = texture()
      const outline = paintTextureShape(asset, input('ellipse', [2, 2], [2 + width, 2 + height]))
      const filled = paintTextureShape(
        asset,
        input('ellipse', [2, 2], [2 + width, 2 + height], true),
      )
      expect(outline.bitmap.data.some(Boolean)).toBe(true)
      expect(paintTextureShape(asset, input('ellipse', [2 + width, 2 + height], [2, 2]))).toEqual(
        outline,
      )
      for (let y = 2; y <= 2 + height; y++)
        for (let x = 2; x <= 2 + width; x++) {
          for (const bitmap of [outline.bitmap, filled.bitmap]) {
            const value = bitmap.data[y * 16 + x]
            expect(value).toBe(bitmap.data[y * 16 + 4 + width - x])
            expect(value, `ellipse ${width}x${height}, pixel ${x},${y}`).toBe(
              bitmap.data[(4 + height - y) * 16 + x],
            )
          }
          if (outline.bitmap.data[y * 16 + x]) expect(filled.bitmap.data[y * 16 + x]).toBe(2)
        }
    }
})

test('seamless shapes use the short wrapped path and invalid coordinates are no-ops', () => {
  const asset = texture()
  asset.seamless = true
  const rectangle = paintTextureShape(asset, input('rectangle', [15, 15], [1, 1], true))
  expect(rectangle.bitmap.data.filter((value) => value === 2)).toHaveLength(9)
  for (const y of [15, 0, 1])
    for (const x of [15, 0, 1]) expect(rectangle.bitmap.data[y * 16 + x]).toBe(2)
  for (const bad of [NaN, Infinity, -1, 16, 0.5]) {
    expect(paintTextureShape(asset, input('ellipse', [bad, 0], [2, 2]))).toBe(asset)
  }
})
