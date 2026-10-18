import { expect, test } from 'bun:test'
import { composePythonCopiedEdit } from './composeCopiedEdit'
import { pythonSourceRangeMapper } from './sourceCopies'
import type { PythonSourceEdit } from './sourceEdits'

function movement(first: string, second: string): PythonSourceEdit {
  return {
    range: { start: 0, end: first.length + second.length },
    expected: first + second,
    replacement: second + first,
    copies: [
      { source: { start: 0, end: first.length }, target: second.length },
      { source: { start: first.length, end: first.length + second.length }, target: 0 },
    ],
  }
}

test('edits follow their moved statement, including two owners at the same original boundary', () => {
  const first = 'def f():\r\n    x = 1 # 🐢\r\n',
    second = 'print(f()) # fim\r\n',
    source = first + second,
    parent = movement(first, second),
    number = first.indexOf('1'),
    boundary = first.length
  const result = composePythonCopiedEdit(source, parent, [
    {
      copy: parent.copies![0]!,
      edits: [
        { range: { start: number, end: number + 1 }, expected: '1', replacement: '200' },
        { range: { start: boundary, end: boundary }, expected: '', replacement: '    pass\r\n' },
      ],
    },
    {
      copy: parent.copies![1]!,
      edits: [
        { range: { start: boundary, end: boundary }, expected: '', replacement: '# chamada\r\n' },
      ],
    },
  ])
  expect(result.replacement).toBe(`# chamada\r\n${second}${first.replace('1', '200')}    pass\r\n`)
  expect(parent).toEqual(movement(first, second))
  const map = pythonSourceRangeMapper([result])
  for (const match of source.matchAll(/#[^\r\n]*/g)) {
    const target = map({ start: match.index, end: match.index + match[0].length })!
    expect(result.replacement.slice(target.start, target.end)).toBe(match[0])
  }
})

test('nested moves retain inner literal proofs at their new position', () => {
  const first = 'a = 1 # a\nb = 2 # b\n',
    second = 'print(a, b)\n',
    source = first + second,
    parent = movement(first, second),
    inner = movement('a = 1 # a\n', 'b = 2 # b\n')
  const result = composePythonCopiedEdit(source, parent, [
    { copy: parent.copies![0]!, edits: [inner] },
  ])
  expect(result.replacement).toBe('print(a, b)\nb = 2 # b\na = 1 # a\n')
  const map = pythonSourceRangeMapper([result])
  for (const match of source.matchAll(/#[^\r\n]*/g)) {
    const target = map({ start: match.index, end: match.index + match[0].length })!
    expect(result.replacement.slice(target.start, target.end)).toBe(match[0])
  }
})

test('new statements are anchored outside retained copies and their internal appends', () => {
  const first = 'def f():\n    pass # interno\n',
    second = 'print(f()) # chamada\n',
    source = first + second,
    parent = movement(first, second)
  const result = composePythonCopiedEdit(
    source,
    parent,
    [
      {
        copy: parent.copies![0]!,
        edits: [
          {
            range: { start: first.length, end: first.length },
            expected: '',
            replacement: '    print(1)\n',
          },
        ],
      },
    ],
    [
      { before: parent.copies![1], text: 'print("antes")\n' },
      { before: parent.copies![0], text: 'print("meio")\n' },
      { text: 'print("depois")\n' },
    ],
  )
  expect(result.replacement).toBe(
    `print("antes")\n${second}print("meio")\n${first}    print(1)\nprint("depois")\n`,
  )
  expect(() =>
    composePythonCopiedEdit(source, parent, [], [{ before: { ...parent.copies![0]! }, text: 'x' }]),
  ).toThrow('posição')
})

test('composition rejects stale text, invalid boundaries and edits escaping their owner', () => {
  const first = 'a = "🐢"\r\n',
    second = 'pass\r\n',
    source = first + second,
    parent = movement(first, second),
    copy = parent.copies![0]!
  for (const edit of [
    { range: { start: 0, end: 1 }, expected: 'b', replacement: 'c' },
    { range: { start: 6, end: 7 }, expected: source.slice(6, 7), replacement: '' },
    { range: { start: first.length - 1, end: first.length }, expected: '\n', replacement: '' },
    { range: { start: first.length, end: source.length }, expected: second, replacement: '' },
  ])
    expect(() => composePythonCopiedEdit(source, parent, [{ copy, edits: [edit] }])).toThrow()
  expect(() => composePythonCopiedEdit(source, parent, [{ copy: { ...copy }, edits: [] }])).toThrow(
    'único',
  )
  expect(() =>
    composePythonCopiedEdit(source, parent, [
      { copy, edits: [] },
      { copy, edits: [] },
    ]),
  ).toThrow('único')
  const edit = { range: { start: 0, end: 1 }, expected: 'a', replacement: 'b' }
  expect(() => composePythonCopiedEdit(source, parent, [{ copy, edits: [edit, edit] }])).toThrow(
    'conflitantes',
  )
})
