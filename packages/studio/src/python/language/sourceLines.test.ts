import { expect, test } from 'bun:test'
import { indexPythonSourceLines } from './sourceLines'

test('indexes mixed physical line endings and EOF without backwards scans', () => {
  const index = indexPythonSourceLines('a\r\nb\rc\n🐢')
  for (const [offset, line] of [
    [0, { start: 0, end: 1, next: 3 }],
    [1, { start: 0, end: 1, next: 3 }],
    [3, { start: 3, end: 4, next: 5 }],
    [5, { start: 5, end: 6, next: 7 }],
    [9, { start: 7, end: 9, next: 9 }],
  ] as const)
    expect(index.lineAt(offset)).toEqual(line)
  expect(indexPythonSourceLines('x\r\n').lineAt(3)).toEqual({ start: 3, end: 3, next: 3 })
  expect(indexPythonSourceLines('').lineAt(0)).toEqual({ start: 0, end: 0, next: 0 })
  for (const offset of [-1, 10, 0.5, NaN]) expect(() => index.lineAt(offset)).toThrow('Posição')
})
