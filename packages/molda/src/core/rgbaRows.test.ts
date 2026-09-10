import { expect, test } from 'bun:test'
import { sceneRasterFromCanvas } from '../scene/imageImport'
import { reverseRgbaRowsInPlace } from './rgbaRows'

test('RGBA row reversal is an involution, preserves every channel and matches the established canvas import contract', () => {
  for (const width of [1, 2, 7, 1024])
    for (const height of [1, 2, 3, 8]) {
      const input = Uint8Array.from({ length: width * height * 4 }, (_, i) => (i * 37 + 11) % 256)
      const actual: Uint8Array = input.slice()
      const expected = sceneRasterFromCanvas(width, height, new Uint8ClampedArray(input)).pixels
      reverseRgbaRowsInPlace(actual, width, height)
      expect(actual).toEqual(expected)
      reverseRgbaRowsInPlace(actual, width, height)
      expect(actual).toEqual(input)
    }
})

test('RGBA row reversal respects subarray boundaries and refuses bad dimensions before mutating bytes', () => {
  const backing = Uint8Array.from({ length: 32 }, (_, i) => i),
    before = backing.slice()
  const view = backing.subarray(4, 28)
  reverseRgbaRowsInPlace(view, 2, 3)
  expect(backing.subarray(0, 4)).toEqual(before.subarray(0, 4))
  expect(backing.subarray(28)).toEqual(before.subarray(28))
  expect(view).toEqual(
    Uint8Array.of(
      ...before.subarray(20, 28),
      ...before.subarray(12, 20),
      ...before.subarray(4, 12),
    ),
  )
  for (const dimensions of [
    [0, 3],
    [2, -1],
    [2.5, 3],
    [2, 2],
    [Infinity, 1],
    [Number.MAX_SAFE_INTEGER, 2],
  ]) {
    const unchanged = backing.slice()
    expect(() => reverseRgbaRowsInPlace(view, dimensions[0]!, dimensions[1]!)).toThrow(RangeError)
    expect(backing).toEqual(unchanged)
  }
})
