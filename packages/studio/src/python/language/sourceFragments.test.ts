import { expect, test } from 'bun:test'
import { composePythonCopiedEdit } from './composeCopiedEdit'
import type { PythonSourceEdit } from './sourceEdits'
import { consolidatePythonTransferredEdits, editPythonSourceFragment } from './sourceFragments'

test('cross-suite copies require atomic removal of their original occurrence', () => {
  const source = 'a\r\nb # 🐢\r\n'
  const start = source.indexOf('b')
  const insertion: PythonSourceEdit = {
    range: { start: 0, end: 0 },
    expected: '',
    replacement: source.slice(start),
    copies: [{ source: { start, end: source.length }, target: 0 }],
  }
  expect(() => composePythonCopiedEdit(source, insertion, [])).toThrow('fonte original')
  expect(() => consolidatePythonTransferredEdits(source, [insertion])).toThrow('fonte original')
  const moved = consolidatePythonTransferredEdits(source, [
    insertion,
    {
      range: { start, end: source.length },
      expected: source.slice(start),
      replacement: '',
    },
  ])
  expect(moved.replacement).toBe('b # 🐢\r\na\r\n')
  expect(moved.copies).toHaveLength(2)
  expect(() =>
    consolidatePythonTransferredEdits(source, [
      { ...insertion, replacement: 'forjado' },
      { range: { start, end: source.length }, expected: source.slice(start), replacement: '' },
    ]),
  ).toThrow('fonte original')
})

test('fragment edits split copy proofs without changing Unicode or CRLF boundaries', () => {
  const source = '    x = "🐢"\r\n    print(x) # nota\r\n'
  const second = source.indexOf('    print')
  const fragment = {
    text: source,
    copies: [{ source: { start: 0, end: source.length }, target: 0 }],
  }
  const shifted = editPythonSourceFragment(source, fragment, [
    { range: { start: 0, end: 4 }, replacement: '\t' },
    { range: { start: second, end: second + 4 }, replacement: '\t' },
  ])
  expect(shifted.text).toBe('\tx = "🐢"\r\n\tprint(x) # nota\r\n')
  expect(shifted.copies).toHaveLength(2)
  const emoji = source.indexOf('🐢')
  expect(() =>
    editPythonSourceFragment(source, fragment, [
      { range: { start: emoji + 1, end: emoji + 2 }, replacement: '' },
    ]),
  ).toThrow('intervalos')
  expect(() =>
    editPythonSourceFragment(source, fragment, [
      { range: { start: second - 1, end: second }, replacement: '' },
    ]),
  ).toThrow('intervalos')
})
