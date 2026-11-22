import { expect, test } from 'bun:test'
import { JsonByteSizeCache, utf8ByteLength } from './jsonBytes'

test('UTF-8 and pretty JSON size match the platform encoder, including escaped and unpaired Unicode', () => {
  const cache = new JsonByteSizeCache(66)
  const strings = [
    '',
    'vila',
    '\0\b\t\n\f\r\u001f"\\',
    'ç界🎨',
    '\ud800',
    '\udfff',
    '\ud800a\udfff',
    '\u2028\u2029',
  ]
  const values: unknown[] = [null, true, false, 0, -0, 1e-7, 1e21, [], {}, { unused: undefined }]
  for (const text of strings) {
    expect(utf8ByteLength(text)).toBe(new TextEncoder().encode(text).byteLength)
    values.push(text, { [text]: [text, { child: text, absent: undefined }] })
  }
  for (const value of values) {
    const exact = new TextEncoder().encode(JSON.stringify(value, null, 2)).byteLength
    expect(cache.byteLength(value)).toBe(exact)
    expect(cache.byteLength(value, exact)).toBe(exact)
    expect(cache.byteLength(value, exact - 1)).toBe(Infinity)
  }
})

test('JSON summaries reuse immutable subtrees and count their indentation at every occurrence', () => {
  let visits = 0
  const leaf = new Proxy(Object.freeze({ nested: Object.freeze([1, 'x']) }), {
    ownKeys(target) {
      visits++
      return Reflect.ownKeys(target)
    },
  })
  const cache = new JsonByteSizeCache(66)
  expect(cache.byteLength(leaf)).toBeGreaterThan(0)
  expect(visits).toBe(1)
  const value = { one: leaf, two: [leaf, { three: leaf }] }
  const measured = cache.byteLength(value)
  expect(visits).toBe(1)
  expect(measured).toBe(new TextEncoder().encode(JSON.stringify(value, null, 2)).byteLength)
  expect(new JsonByteSizeCache(2).byteLength(value)).toBe(Infinity)
})

test('JSON byte admission refuses unsupported, cyclic or accessor data without running it', () => {
  let calls = 0
  const getter = Object.defineProperty({}, 'x', {
    enumerable: true,
    get() {
      calls++
      return 1
    },
  })
  const cycle: Record<string, unknown> = {}
  cycle.self = cycle
  let deep: unknown = 1
  for (let i = 0; i < 10_000; i++) deep = { child: deep }
  const cache = new JsonByteSizeCache(66)
  for (const value of [
    getter,
    cycle,
    deep,
    new Uint8Array(1),
    new Date(),
    undefined,
    Infinity,
    () => 1,
  ])
    expect(cache.byteLength(value)).toBe(Infinity)
  expect(calls).toBe(0)
})
