import { expect, test } from 'bun:test'
import {
  applyPythonSourceEdits,
  pythonModelPositionToOffset,
  pythonOffsetToPosition,
  pythonPositionToOffset,
} from './sourceEdits'
import type { PythonParsedDocument } from './types'

function document(source: string): PythonParsedDocument {
  return {
    version: 1,
    language: 'python',
    source,
    identity: {
      projectId: 'one',
      instanceId: 'editor',
      path: 'main.py',
      revision: 'a'.repeat(64),
      generation: 1,
    },
    tree: { kind: 'Module', fields: { body: [], type_ignores: [] } },
    tokens: [],
    diagnostics: [],
  }
}
test('local edits preserve opaque code, CRLF, Unicode, comments and the untouched spelling', () => {
  const parsed = document(
    '# início\r\nnome = "🐢 ação"\r\ntartaruga.forward(50) # distância\r\nx = [a*a for a in range(3)]\r\n',
  )
  const start = parsed.source.indexOf('50')
  const changed = applyPythonSourceEdits(parsed, parsed, [
    { range: { start, end: start + 2 }, expected: '50', replacement: '100' },
  ])
  expect(changed).toBe(parsed.source.replace('forward(50)', 'forward(100)'))
  expect(pythonOffsetToPosition(parsed.source, start)).toEqual({ line: 3, column: 19 })
  expect(pythonOffsetToPosition('a = "🐢"; b = 1\rc = 2', 10)).toEqual({ line: 1, column: 11 })
  expect(pythonOffsetToPosition('a\r\nb\rc\nd', 7)).toEqual({ line: 4, column: 1 })
  expect(() => pythonOffsetToPosition('a\r\nb', 2)).toThrow('Posição')
  expect(() => pythonOffsetToPosition('🐢', 1)).toThrow('Posição')
})
test('stale document identities and source buffers cannot overwrite newer typing', () => {
  const parsed = document('x = 1\n')
  for (const identity of [
    { ...parsed.identity, projectId: 'two' },
    { ...parsed.identity, instanceId: 'observer' },
    { ...parsed.identity, path: 'other.py' },
    { ...parsed.identity, revision: 'b'.repeat(64) },
    { ...parsed.identity, generation: 2 },
  ])
    expect(() => applyPythonSourceEdits(parsed, { ...parsed, identity }, [])).toThrow('mudou')
  expect(() => applyPythonSourceEdits(parsed, { ...parsed, source: 'x = 2\n' }, [])).toThrow(
    'mudou',
  )
})

test('source selection maps UTF-16 positions across LF, CRLF and non-BMP characters', () => {
  const source = 'nome = "🐢"\r\nprint(nome)\r# fim\n'
  for (let offset = 0; offset <= source.length; offset++) {
    if (
      (source[offset - 1] === '\r' && source[offset] === '\n') ||
      (source.charCodeAt(offset) >= 0xdc00 && source.charCodeAt(offset) <= 0xdfff)
    )
      continue
    const { line, column } = pythonOffsetToPosition(source, offset)
    expect(pythonPositionToOffset(source, line, column)).toBe(offset)
  }
  for (const [line, column] of [
    [0, 1],
    [1, 0],
    [5, 1],
    [1, 99],
    [1, 10],
  ])
    expect(() => pythonPositionToOffset(source, line!, column!)).toThrow('Posição')
})
test('refuses comment loss, overlapping edits, split characters and invalid analysis', () => {
  const parsed = document('if True:\r\n    # comentário\r\n    print("🐢")\r\n')
  const start = parsed.source.indexOf('#')
  parsed.tokens = [{ kind: 'COMMENT', text: '# comentário', range: { start, end: start + 12 } }]
  expect(() =>
    applyPythonSourceEdits(parsed, parsed, [
      {
        range: { start: 0, end: parsed.source.length },
        expected: parsed.source,
        replacement: 'pass',
      },
    ]),
  ).toThrow('comentários')
  const at = parsed.source.indexOf('🐢')
  expect(() =>
    applyPythonSourceEdits(parsed, parsed, [
      {
        range: { start: at + 1, end: at + 2 },
        expected: parsed.source.slice(at + 1, at + 2),
        replacement: '',
      },
    ]),
  ).toThrow('intervalos')
  expect(() =>
    applyPythonSourceEdits(parsed, parsed, [
      { range: { start: 9, end: 10 }, expected: '\n', replacement: '' },
    ]),
  ).toThrow('intervalos')
  const edit = { range: { start: 0, end: 2 }, expected: 'if', replacement: 'while' }
  expect(() => applyPythonSourceEdits(parsed, parsed, [edit, edit])).toThrow('intervalos')
  expect(() => applyPythonSourceEdits({ ...parsed, tree: null }, parsed, [])).toThrow('sintaxe')
  expect(() => applyPythonSourceEdits(parsed, parsed, [{ ...edit, expected: 'no' }])).toThrow(
    'alterado',
  )
})

test('Monaco selection tolerates only normalized line endings, never stale text', () => {
  const source = 'x = "🐢"\r\ny = 2\nprint(x + y)\r'
  const normalized = source.replace(/\r\n|\r/g, '\n')
  for (const model of [source, normalized, normalized.replace(/\n/g, '\r\n')]) {
    expect(pythonModelPositionToOffset(source, model, 3, 7)).toBe(source.indexOf('(x') + 1)
    expect(pythonModelPositionToOffset(source, model, 1, 7)).toBeUndefined()
    expect(pythonModelPositionToOffset(source, model, 9, 1)).toBeUndefined()
  }
  for (const model of [
    normalized.replace('y = 2', 'y = 3'),
    `${normalized} `,
    normalized.replace('🐢', '🐍'),
  ])
    expect(pythonModelPositionToOffset(source, model, 3, 7)).toBeUndefined()
})
