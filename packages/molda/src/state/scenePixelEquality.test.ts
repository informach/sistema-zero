import { expect, test } from 'bun:test'
import { sameScenePixelBytes } from './sceneBlob'

test('word comparison matches the byte oracle at every small offset, tail and mismatch position', () => {
  for (let length = 0; length <= 65; length++)
    for (let aOffset = 0; aOffset < 8; aOffset++)
      for (let bOffset = 0; bOffset < 8; bOffset++) {
        const a = new Uint8Array(length + 16).fill(255).subarray(aOffset, aOffset + length)
        const b = new Uint8Array(length + 16).fill(7).subarray(bOffset, bOffset + length)
        for (let i = 0; i < length; i++) a[i] = b[i] = (i * 31 + length * 17) % 256
        expect(sameScenePixelBytes(a, b)).toBe(true)
        for (let i = 0; i < length; i++) {
          b[i] = b[i]! ^ 128
          expect(sameScenePixelBytes(a, b)).toBe(a.every((byte, j) => byte === b[j]))
          b[i] = b[i]! ^ 128
        }
        expect(sameScenePixelBytes(a, b.subarray(1))).toBe(length === 0)
      }
})

test('large exact equality keeps high-bit words, chosen intervals, no mutation, and backing guards', () => {
  const a = new Uint8Array(4 * 1024 * 1024).fill(255),
    b = new Uint8Array(a)
  expect(sameScenePixelBytes(a, b)).toBe(true)
  for (const index of [0, 1, 2, 3, 4096, a.length - 1]) {
    b[index] = 0
    expect(sameScenePixelBytes(a, b)).toBe(false)
    b[index] = 255
  }
  expect(a.every((byte) => byte === 255)).toBe(true)
  expect(sameScenePixelBytes(a, b)).toBe(true)
  expect(sameScenePixelBytes(new Uint8Array(new SharedArrayBuffer(4)), new Uint8Array(4))).toBe(
    false,
  )
  const detached = new Uint8Array(4)
  structuredClone(detached, { transfer: [detached.buffer] })
  expect(() => sameScenePixelBytes(detached, new Uint8Array())).toThrow()
})
