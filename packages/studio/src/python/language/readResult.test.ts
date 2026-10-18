import { expect, test } from 'bun:test'
import { readPythonAnalysisResult } from './readResult'
import type { PythonAnalysisResult, PythonByteCompilation } from './types'

function parsed() {
  return {
    ok: true as const,
    tree: { kind: 'Module', id: '1', fields: { body: [], type_ignores: [] } },
    tokens: [],
    diagnostics: [],
  }
}

test('byte compilation accepts complete bounded structural facts and rejects facts attached to syntax failure', () => {
  const structure: NonNullable<PythonByteCompilation['structure']> = {
    version: 1,
    nodesVisited: 1,
    usesLoop: false,
    usesConditional: false,
    assignedNames: [],
    definedFunctions: [],
    callTargets: [],
  }
  const raw = {
    ok: true,
    compiledBytes: true,
    diagnostics: [],
    structure,
  } satisfies PythonAnalysisResult
  expect(readPythonAnalysisResult(JSON.stringify(raw), 0)).toEqual(raw)
  for (const candidate of [
    { ...raw, structure: { ...structure, assignedNames: ['x', 'x'] } },
    { ...raw, diagnostics: [{ kind: 'syntax', message: 'invalid source' }] },
  ]) {
    expect(() => readPythonAnalysisResult(JSON.stringify(candidate), 0)).toThrow()
  }
})

test('exact-byte compilation requires explicit confirmation and bounded syntax diagnostics', () => {
  for (const diagnostics of [[], [{ kind: 'syntax' as const, message: 'encoding problem' }]]) {
    expect(
      readPythonAnalysisResult(JSON.stringify({ ok: true, compiledBytes: true, diagnostics }), 0),
    ).toEqual({ ok: true, compiledBytes: true, diagnostics })
  }
  for (const raw of [
    { ok: true, compiledBytes: false, diagnostics: [] },
    { ok: true, compiledBytes: true, diagnostics: [{ kind: 'syntax', message: '' }] },
    { ok: true, compiledBytes: true, diagnostics: [{ kind: 'execution', message: 'bad' }] },
    {
      ok: true,
      compiledBytes: true,
      diagnostics: [
        { kind: 'syntax', message: 'a' },
        { kind: 'syntax', message: 'b' },
      ],
    },
  ])
    expect(() => readPythonAnalysisResult(JSON.stringify(raw), 0)).toThrow()
})
test('preserves arbitrary precision literals and checks parser ranges before codecs', () => {
  const raw = parsed()
  Object.assign(raw.tree.fields, {
    body: [
      {
        kind: 'Constant',
        id: '2',
        range: { start: 0, end: 20 },
        fields: { value: { literal: 'int', value: '90071992547409931234' }, kind: null },
      },
    ],
  })
  expect(readPythonAnalysisResult(JSON.stringify(raw), 20)).toEqual(raw)
  expect(() => readPythonAnalysisResult(JSON.stringify(raw), 19)).toThrow('Intervalo')
})
test('rejects impossible trees, token ranges and syntax status instead of accepting partial state', () => {
  for (const raw of [
    { ...parsed(), tree: null },
    { ...parsed(), compilable: false },
    { ...parsed(), compilable: 'true' },
    { ...parsed(), tree: {} },
    { ...parsed(), tokens: [{ kind: 'NAME', text: 'x', range: { start: -1, end: 0 } }] },
    {
      ...parsed(),
      tree: { kind: 'Module', id: '1', fields: { body: [{ kind: 'Name', id: '1', fields: {} }] } },
    },
    { ...parsed(), tree: { kind: 'Module', id: '1', fields: { constructor: 'bad' } } },
    { ...parsed(), tree: { kind: 'Module', id: '1', fields: { body: 3 } } },
  ])
    expect(() => readPythonAnalysisResult(JSON.stringify(raw), 20)).toThrow()
  const syntax = {
    ok: true as const,
    tree: null,
    tokens: [],
    diagnostics: [
      { kind: 'syntax' as const, message: 'Esperava uma expressão', range: { start: 2, end: 2 } },
    ],
  }
  expect(readPythonAnalysisResult(JSON.stringify(syntax), 2)).toEqual(syntax)
})
