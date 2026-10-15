import { expect, test } from 'bun:test'
import { canonical, sanitize, transition } from '../src/contracts'

test('canonical identity and terminal transitions', () => {
  expect(canonical({ b: 2, a: 1 })).toBe(canonical({ a: 1, b: 2 }))
  expect(() => transition('succeeded', 'running')).toThrow()
  expect(sanitize('\x1b]52;c;bad\x07hello')).toBe('hello')
})
