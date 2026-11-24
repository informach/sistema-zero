import { expect, test } from 'bun:test'
import { sameMapDocumentMetadata } from './mapDocumentBoundary'

test('native map metadata preserves zero, false, signed fractions and JSON optional values', () => {
  expect(
    sameMapDocumentMetadata(
      { x: -1.5, opacity: 0, front: false, unused: undefined },
      { front: false, opacity: 0, x: -1.5 },
    ),
  ).toBe(true)
  expect(sameMapDocumentMetadata({ front: false }, {})).toBe(false)
  expect(sameMapDocumentMetadata({ opacity: 0 }, { opacity: 1 })).toBe(false)
  expect(sameMapDocumentMetadata({ future: { important: 1 } }, {})).toBe(false)
})

test('native metadata compares wire arrays and bitmap buffers without changing their values', () => {
  const data = new Uint8Array([0, 1, 15])
  expect(sameMapDocumentMetadata({ data }, { data: [0, 1, 15] })).toBe(true)
  expect(sameMapDocumentMetadata({ data }, { data: [0, 1, 14] })).toBe(false)
  expect(sameMapDocumentMetadata({ data }, { data: [0, 1] })).toBe(false)
  expect([...data]).toEqual([0, 1, 15])
})

test('unknown fields and accessors cannot run code during metadata comparison', () => {
  let reads = 0
  const raw = Object.defineProperty({}, 'future', {
    enumerable: true,
    get() {
      reads++
      return 'lost'
    },
  })
  expect(sameMapDocumentMetadata(raw, {})).toBe(false)
  expect(sameMapDocumentMetadata(raw, { future: 'lost' })).toBe(false)
  const array = Object.defineProperty([1], '0', {
    get() {
      reads++
      return 1
    },
  })
  expect(sameMapDocumentMetadata(array, new Uint8Array([1]))).toBe(false)
  expect(reads).toBe(0)
  expect(sameMapDocumentMetadata({ n: Infinity }, { n: Infinity })).toBe(false)
  expect(
    sameMapDocumentMetadata(
      {
        run() {
          return 1
        },
      },
      {
        run() {
          return 1
        },
      },
    ),
  ).toBe(false)
  expect(sameMapDocumentMetadata(new Date(0), new Date(0))).toBe(false)
})

test('metadata budgets reject before visiting oversized binary payloads and bound cycles', () => {
  let reads = 0
  const raw = Object.defineProperty(new Array(1000).fill(0), '0', {
    get() {
      reads++
      return 0
    },
  })
  expect(sameMapDocumentMetadata(raw, new Uint8Array(1000), { maxBinaryBytes: 2 })).toBe(false)
  expect(reads).toBe(0)
  expect(sameMapDocumentMetadata({ a: { b: 1 } }, { a: { b: 1 } }, { maxNodes: 2 })).toBe(false)
  expect(sameMapDocumentMetadata({ a: { b: 1 } }, { a: { b: 1 } }, { maxDepth: 1 })).toBe(false)
  expect(sameMapDocumentMetadata({ name: 'long' }, { name: 'long' }, { maxStringUnits: 2 })).toBe(
    false,
  )
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  expect(sameMapDocumentMetadata(cyclic, cyclic)).toBe(false)
})
