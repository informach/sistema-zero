import { expect, test } from 'bun:test'
import { PythonLanguageSession } from '../runtime/pyright'

test('omitted provided-module roots fail before preparing a subprocess', () => {
  const input = JSON.parse('{"root":"."}')
  Object.defineProperty(input, 'nodePath', {
    get() {
      throw new Error('Unexpected subprocess preparation')
    },
  })
  expect(() => new PythonLanguageSession(input)).toThrow(TypeError)
})
