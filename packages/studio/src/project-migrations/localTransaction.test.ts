import { expect, test } from 'bun:test'
import { localSnapshotsEqual } from './localTransaction'

test('snapshot comparison preserves absent values, negative zero, arrays and unknown fields', () => {
  expect(localSnapshotsEqual({ x: undefined, zero: -0 }, { zero: -0, x: undefined })).toBe(true)
  expect(localSnapshotsEqual({ x: undefined }, {})).toBe(false)
  expect(localSnapshotsEqual({ zero: -0 }, { zero: 0 })).toBe(false)
  expect(localSnapshotsEqual(new Array(1), [])).toBe(false)
  expect(localSnapshotsEqual({ future: { retained: 1 } }, { future: { retained: 2 } })).toBe(false)
})

test('snapshot comparison handles deep data and cycles without invoking accessors', () => {
  const make = () => {
    const root: Record<string, unknown> = {}
    let current = root
    for (let index = 0; index < 10_000; index++) {
      const child: Record<string, unknown> = {}
      current.child = child
      current = child
    }
    current.value = 'kept'
    return root
  }
  expect(localSnapshotsEqual(make(), make())).toBe(true)
  const left: Record<string, unknown> = { value: 1 },
    right: Record<string, unknown> = { value: 1 }
  left.self = left
  right.self = right
  expect(localSnapshotsEqual(left, right)).toBe(true)
  right.value = 2
  expect(localSnapshotsEqual(left, right)).toBe(false)
  let calls = 0
  const getter = Object.defineProperty({}, 'value', {
    enumerable: true,
    get() {
      calls++
      return 1
    },
  })
  expect(localSnapshotsEqual(getter, { value: 1 })).toBe(false)
  expect(calls).toBe(0)
  expect(localSnapshotsEqual(new Date(0), {})).toBe(false)
})
