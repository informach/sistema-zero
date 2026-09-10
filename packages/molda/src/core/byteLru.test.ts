import { describe, expect, test } from 'bun:test'
import { ByteLru } from './byteLru'

describe('byte-budgeted LRU', () => {
  const make = (maxBytes = 10, maxEntries = 3) =>
    new ByteLru<string, string>({
      maxBytes,
      maxEntries,
      sizeOf: (_key, value) => value.length,
    })
  test('evicts least recently read entries by bytes, not just by count', () => {
    const cache = make()
    cache.set('a', 'aaaa')
    cache.set('b', 'bbbb')
    expect(cache.get('a')).toBe('aaaa')
    cache.set('c', 'ccccc')
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe('aaaa')
    expect(cache.bytes).toBe(9)
    expect(cache.size).toBe(2)
  })
  test('replaces and deletes with exact accounting; oversized replacement is not retained', () => {
    const cache = make()
    cache.set('a', 'aaaa')
    cache.set('a', 'aa')
    expect(cache.bytes).toBe(2)
    cache.set('a', 'too large for cache')
    expect(cache.get('a')).toBeUndefined()
    expect(cache.bytes).toBe(0)
    cache.set('b', 'bb')
    cache.delete('b')
    cache.delete('b')
    expect(cache.bytes).toBe(0)
  })
  test('bounds zero-byte entries, disabled caches, and repeated open/clear cycles', () => {
    const cache = make()
    for (let cycle = 0; cycle < 20; cycle += 1) {
      for (let i = 0; i < 100; i += 1) cache.set(String(i), '')
      expect(cache.size).toBe(3)
      expect(cache.bytes).toBe(0)
      cache.clear()
      expect(cache.size).toBe(0)
    }
    const disabled = make(10, 0)
    disabled.set('a', 'a')
    expect(disabled.size).toBe(0)
  })
  test('invalid budgets and accounting fail explicitly', () => {
    expect(() => make(-1)).toThrow(RangeError)
    const cache = new ByteLru({ maxBytes: 10, maxEntries: 3, sizeOf: () => Number.NaN })
    expect(() => cache.set('a', 'b')).toThrow(RangeError)
  })
})
