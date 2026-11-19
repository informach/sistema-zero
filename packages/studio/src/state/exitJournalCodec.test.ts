import { expect, test } from 'bun:test'
import {
  decodeExitJournal,
  decodeRecoverySnapshot,
  EXIT_JOURNAL_MAX_CHARS,
  encodeExitJournal,
  encodeRecoverySnapshot,
} from './exitJournalCodec'

test('journal codec preserves unknown fields, undefined, arrays, tags and negative zero', () => {
  const value = {
    future: { version: 17, missing: undefined, negative: -0 },
    lists: [[], [-1], [0], { object: [], array: [] }],
    nil: null,
  }
  const restored = decodeExitJournal(encodeExitJournal(value))
  expect(restored).toEqual(value)
  if (
    !restored ||
    typeof restored !== 'object' ||
    !('future' in restored) ||
    !restored.future ||
    typeof restored.future !== 'object' ||
    !('negative' in restored.future)
  )
    throw new Error('Missing restored value')
  expect(Object.is(restored.future.negative, -0)).toBe(true)
  expect(Object.hasOwn(restored.future, 'missing')).toBe(true)
})

test('journal codec preserves a deep editable tree without recursive stringify', () => {
  let tree: unknown = { id: 'last', type: 'sz_val_number', fields: { NUM: 480 } }
  for (let index = 0; index < 10_000; index++)
    tree = { id: `block-${index}`, next: { block: tree } }
  const restored = decodeExitJournal(encodeExitJournal(tree))
  let cursor = restored
  let count = 0
  while (
    cursor &&
    typeof cursor === 'object' &&
    'next' in cursor &&
    cursor.next &&
    typeof cursor.next === 'object' &&
    'block' in cursor.next
  ) {
    count++
    cursor = cursor.next.block
  }
  expect(count).toBe(10_000)
  expect(cursor).toEqual({ id: 'last', type: 'sz_val_number', fields: { NUM: 480 } })
})

test('journal codec rejects executable properties and cycles without invoking getters', () => {
  let invoked = false
  expect(() =>
    encodeExitJournal({
      get value() {
        invoked = true
        return 1
      },
    }),
  ).toThrow()
  expect(invoked).toBe(false)
  const cycle: Record<string, unknown> = {}
  cycle.self = cycle
  expect(() => encodeExitJournal(cycle)).toThrow()
})

test('journal codec treats prototype-looking keys as data', () => {
  const value = JSON.parse('{"__proto__":{"polluted":true},"constructor":"data"}')
  const restored = decodeExitJournal(encodeExitJournal(value))
  expect(restored).toEqual(value)
  expect(Object.hasOwn({}, 'polluted')).toBe(false)
})

for (const wire of [
  { version: 2, root: null, nodes: [] },
  { version: 1, root: [1], nodes: [{ object: [] }] },
  { version: 1, root: [0], nodes: [{ object: [['cycle', [0]]] }] },
  {
    version: 1,
    root: [0],
    nodes: [
      {
        object: [
          ['key', 1],
          ['key', 2],
        ],
      },
    ],
  },
  { version: 1, root: [0], nodes: [{ array: [[]] }] },
  { version: 1, root: [0], nodes: [{ object: [] }, { object: [['unreachable', 1]] }] },
])
  test('journal codec rejects malformed or future wire values', () => {
    expect(() => decodeExitJournal(JSON.stringify(wire))).toThrow()
  })

test('both archive and exit contexts preserve the existing v1 wire bytes', () => {
  const value = { negative: -0, missing: undefined, array: [-0, { x: 'x' }] }
  const wire =
    '{"version":1,"root":[0],"nodes":[{"object":[["negative",[-1]],["missing",[]],["array",[1]]]},{"array":[[-1],[2]]},{"object":[["x","x"]]}]}'
  expect(encodeExitJournal(value)).toBe(wire)
  expect(encodeRecoverySnapshot(value)).toBe(wire)
  expect(decodeExitJournal(wire)).toEqual(value)
  expect(decodeRecoverySnapshot(wire)).toEqual(value)
})

test('durable archives support accepted document sizes while the synchronous exit budget stays fixed', () => {
  const value = { text: 'x'.repeat(EXIT_JOURNAL_MAX_CHARS + 1) }
  expect(() => encodeExitJournal(value)).toThrow()
  const encoded = encodeRecoverySnapshot(value)
  expect(encoded.length).toBeGreaterThan(EXIT_JOURNAL_MAX_CHARS)
  expect(() => decodeExitJournal(encoded)).toThrow()
  expect(decodeRecoverySnapshot(encoded)).toEqual(value)
})
