import { expect, test } from 'bun:test'
import { encodeOwnedUtf8 } from '../src/creations/utf8'

function withEncoderOutput<T>(bytes: Uint8Array, run: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'TextEncoder')
  if (!descriptor) throw new Error('TextEncoder descriptor is required')
  Object.defineProperty(globalThis, 'TextEncoder', {
    configurable: true,
    value: class {
      encode() {
        return bytes
      }
    },
  })
  try {
    return run()
  } finally {
    Object.defineProperty(globalThis, 'TextEncoder', descriptor)
  }
}

test('fresh UTF-8 bytes retain empty, Unicode and replacement-character semantics', () => {
  for (const text of ['', 'abc', 'ação 🐢', '\ud800']) {
    const expected = new TextEncoder().encode(text)
    const owned: Uint8Array<ArrayBuffer> = encodeOwnedUtf8(text)
    expect(owned).toEqual(expected)
    expect(owned.buffer instanceof ArrayBuffer).toBe(true)
  }
})

test('the ownership proof creates only a view and preserves the original offset and length', () => {
  const original = new Uint8Array([0, 65, 66, 0]).subarray(1, 3)
  withEncoderOutput(original, () => {
    const result = encodeOwnedUtf8('AB')
    expect(result).not.toBe(original)
    expect(result.buffer).toBe(original.buffer)
    expect(result.byteOffset).toBe(original.byteOffset)
    expect(result.byteLength).toBe(original.byteLength)
    expect(result).toEqual(original)
  })
})

test('an actual SharedArrayBuffer backing store cannot be claimed as owned', () => {
  const shared = new Uint8Array(new SharedArrayBuffer(2))
  withEncoderOutput(shared, () => {
    expect(() => encodeOwnedUtf8('AB')).toThrow(TypeError)
  })
})
