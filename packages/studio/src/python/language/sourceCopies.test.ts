import { expect, test } from 'bun:test'
import { assertPythonCommentsPreserved, pythonSourceRangeMapper } from './sourceCopies'
import { applyPythonSourceEdits, type PythonSourceEdit } from './sourceEdits'
import { relocatePythonTypeIgnores } from './typeIgnorePositions'
import type { PythonParsedDocument } from './types'

// Token intervals for these fixed, single-line fixtures; runtime conformance uses CPython.
function document(source: string): PythonParsedDocument {
  return {
    version: 1,
    language: 'python',
    source,
    identity: {
      projectId: 'p',
      instanceId: 'i',
      path: 'main.py',
      revision: 'a'.repeat(64),
      generation: 1,
    },
    tree: {
      kind: 'Module',
      fields: {
        body: [],
        type_ignores: [...source.matchAll(/# type: ignore\[([^\]]+)\]/g)].map((match) => ({
          kind: 'TypeIgnore',
          fields: {
            lineno: {
              literal: 'int',
              value: String(1 + (source.slice(0, match.index).match(/\r\n|\r|\n/g)?.length ?? 0)),
            },
            tag: `[${match[1]}]`,
          },
        })),
      },
    },
    tokens: [...source.matchAll(/#[^\r\n]*/g)].map((match) => ({
      kind: 'COMMENT',
      text: match[0],
      range: { start: match.index, end: match.index + match[0].length },
    })),
    diagnostics: [],
  }
}

test('literal moves preserve comments, CRLF and type-ignore positions in new order', () => {
  const header = '# 🐢 título\r\n',
    a = 'x = 1 # type: ignore[a]\r\n',
    b = 'y = 2 # type: ignore[b]\r\n',
    tail = '# final\r\n'
  const before = document(header + a + b + tail)
  const edit: PythonSourceEdit = {
    range: { start: header.length, end: header.length + a.length + b.length },
    expected: a + b,
    replacement: b + a,
    copies: [
      { source: { start: header.length, end: header.length + a.length }, target: b.length },
      {
        source: { start: header.length + a.length, end: header.length + a.length + b.length },
        target: 0,
      },
    ],
  }
  const source = applyPythonSourceEdits(before, before, [edit])
  expect(source).toBe(header + b + a + tail)
  const after = document(source)
  expect(() => assertPythonCommentsPreserved(before, after, [edit])).not.toThrow()
  expect(
    relocatePythonTypeIgnores(before, before.tree!, [edit], source).fields.type_ignores,
  ).toEqual(after.tree!.fields.type_ignores)
  const map = pythonSourceRangeMapper([edit])
  for (const token of before.tokens) {
    const target = map(token.range)!
    expect(source.slice(target.start, target.end)).toBe(token.text)
  }
})

test('copy proofs reject forged, duplicated, overlapping or split source ranges', () => {
  const before = document('# 🐢\r\n')
  const edit: PythonSourceEdit = {
    range: { start: 0, end: before.source.length },
    expected: before.source,
    replacement: before.source,
    copies: [{ source: { start: 0, end: before.source.length }, target: 0 }],
  }
  expect(applyPythonSourceEdits(before, before, [edit])).toBe(before.source)
  for (const changed of [
    { ...edit, replacement: '# 🐍\r\n' },
    { ...edit, copies: [...edit.copies!, ...edit.copies!] },
    { ...edit, copies: [{ source: { start: 0, end: 3 }, target: 0 }] },
    { ...edit, copies: [{ source: { start: 0, end: 5 }, target: 0 }] },
    { ...edit, copies: [{ source: { start: -1, end: 6 }, target: 0 }] },
    { ...edit, copies: [{ source: { start: 0, end: 6 }, target: 1 }] },
    { ...edit, copies: [{ source: { start: 0, end: 2 }, target: 0 }] },
  ])
    expect(() => applyPythonSourceEdits(before, before, [changed])).toThrow()
  const repeated = document('# a\n# a\n')
  expect(() =>
    applyPythonSourceEdits(repeated, repeated, [
      {
        range: { start: 0, end: 8 },
        expected: repeated.source,
        replacement: '# a\n',
        copies: [
          { source: { start: 0, end: 4 }, target: 0 },
          { source: { start: 4, end: 8 }, target: 0 },
        ],
      },
    ]),
  ).toThrow('sobrepõem')
})

test('comments cannot be hidden inside a string even with a literal copy proof', () => {
  const before = document('# manter\n')
  const edit: PythonSourceEdit = {
    range: { start: 0, end: before.source.length },
    expected: before.source,
    replacement: `"""${before.source}"""`,
    copies: [{ source: { start: 0, end: before.source.length }, target: 3 }],
  }
  const source = applyPythonSourceEdits(before, before, [edit])
  expect(() =>
    assertPythonCommentsPreserved(before, { ...document(source), tokens: [] }, [edit]),
  ).toThrow('comentário')
  expect(
    pythonSourceRangeMapper([{ range: { start: 2, end: 3 }, expected: 'a', replacement: '' }])({
      start: 0,
      end: 5,
    }),
  ).toBeUndefined()
})

test('a moved annotation must not activate or relocate a Python encoding cookie', () => {
  for (const prefix of ['', '# título\n', '\n']) {
    const before = document(`${prefix}x = 1 # coding: ascii\nprint("ação")\n`)
    const start = before.source.indexOf('x = 1'),
      comment = before.source.indexOf('# coding:')
    const edit: PythonSourceEdit = {
      range: { start, end: comment },
      expected: 'x = 1 ',
      replacement: '',
    }
    const source = applyPythonSourceEdits(before, before, [edit])
    expect(() => assertPythonCommentsPreserved(before, document(source), [edit])).toThrow(
      'codificação',
    )
  }
  const before = document('# coding: utf-8\nx = 1\n')
  const edit: PythonSourceEdit = { range: { start: 20, end: 21 }, expected: '1', replacement: '2' }
  const source = applyPythonSourceEdits(before, before, [edit])
  expect(() => assertPythonCommentsPreserved(before, document(source), [edit])).not.toThrow()
})
