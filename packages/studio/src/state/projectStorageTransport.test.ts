import { expect, test } from 'bun:test'
import { decodeProjectStorageValue, encodeProjectStorageValue } from './projectStorageTransport'

const key = 'sz:v4:project-blocks:deep'
function chain(count: number, tail: unknown = { end: true }): unknown {
  let value = tail
  for (let index = count - 1; index >= 0; index--) value = { id: `block-${index}`, next: value }
  return value
}
function ids(value: unknown): string[] {
  const result: string[] = []
  let current = value
  while (current && typeof current === 'object' && 'id' in current && 'next' in current) {
    result.push(String(current.id))
    current = current.next
  }
  return result
}

test('ten thousand editable nodes use a shallow native-clone envelope and retain all IDs', () => {
  const value = chain(10_000, { unknown: { version: 17, missing: undefined, negative: -0 } })
  const encoded = encodeProjectStorageValue(key, value)
  expect(encoded).toMatchObject({ format: 'sz-project-json-graph', version: 1 })
  const cloned = structuredClone(encoded)
  const restored = decodeProjectStorageValue(key, cloned)
  expect(ids(restored)).toEqual(ids(value))
  let tail = restored as { next?: unknown; unknown?: unknown }
  while (tail && typeof tail === 'object' && 'next' in tail) tail = tail.next as typeof tail
  expect(tail).toEqual({ unknown: { version: 17, missing: undefined, negative: -0 } })
  expect(Object.hasOwn((tail as { unknown: object }).unknown, 'missing')).toBe(true)
})

test('shallow existing values and every non-v4-project namespace keep their native representation', () => {
  const simple = { id: 'small', blocksState: { blocks: { blocks: [] } } }
  expect(encodeProjectStorageValue(key, simple)).toBe(simple)
  const tagged = { format: 'sz-project-json-graph', version: 1, payload: 'learner data' }
  for (const other of [
    'sz:game-storage:deep',
    'sz:v3:project-blocks:deep',
    'sz:v4:unrelated:deep',
  ]) {
    expect(encodeProjectStorageValue(other, tagged)).toBe(tagged)
    expect(decodeProjectStorageValue(other, tagged)).toBe(tagged)
  }
})

test('a shared subtree reached by a deeper path cannot evade the native-depth policy', () => {
  const shared = chain(20)
  const value = { long: chain(50, shared), short: shared }
  const encoded = encodeProjectStorageValue(key, value)
  expect(encoded).toMatchObject({ format: 'sz-project-json-graph' })
  const restored = decodeProjectStorageValue(key, encoded) as typeof value
  expect(ids(restored.long)).toEqual(ids(value.long))
  expect(ids(restored.short)).toEqual(ids(value.short))
})

test('future and malformed envelopes cannot be read or authorized for replacement', () => {
  for (const value of [
    { format: 'sz-project-json-graph', version: 2, payload: '{}' },
    { format: 'sz-project-json-graph', version: 1, payload: 42 },
    { format: 'sz-project-json-graph', version: 1, payload: '{}', unknown: true },
    { format: 'sz-project-json-graph', version: 1, payload: 'not-json' },
  ]) {
    const before = JSON.stringify(value)
    expect(() => decodeProjectStorageValue(key, value)).toThrow()
    expect(() => encodeProjectStorageValue(key, value)).toThrow()
    expect(JSON.stringify(value)).toBe(before)
  }
})

test('getters are rejected before native cloning and prepared envelopes are immutable', () => {
  let invoked = false
  expect(() =>
    encodeProjectStorageValue(key, {
      get code() {
        invoked = true
        return 1
      },
    }),
  ).toThrow()
  expect(invoked).toBe(false)
  const encoded = encodeProjectStorageValue(key, chain(70))
  expect(Object.isFrozen(encoded)).toBe(true)
  expect(encodeProjectStorageValue(key, encoded)).toBe(encoded)
})
