import { expect, test } from 'bun:test'
import { readPythonNode } from './readNode'

test('opaque syntax is bounded before recursion and rejects cycles and extra object payloads', () => {
  const cycle: Record<string, unknown> = { kind: 'Expr', fields: {} }
  cycle.fields = { value: cycle }
  expect(() => readPythonNode(cycle, 100, false)).toThrow('excessiva')
  expect(() => readPythonNode({ kind: 'Pass', fields: {}, extra: cycle }, 100, false)).toThrow(
    'inválido',
  )
  expect(() =>
    readPythonNode(
      { kind: 'Constant', fields: { value: 'x'.repeat(8 * 1024 * 1024 + 1), kind: null } },
      100,
      false,
    ),
  ).toThrow('excessiva')
  expect(() =>
    readPythonNode(
      {
        kind: 'Constant',
        fields: { value: { literal: 'int', value: '1', extra: cycle }, kind: null },
      },
      100,
      false,
    ),
  ).toThrow('Literal')
})

test('parsed IDs are required and unique; generated AST may omit them but keeps range checks', () => {
  expect(() => readPythonNode({ kind: 'Pass', fields: {} }, 20)).toThrow('Nó')
  expect(readPythonNode({ kind: 'Pass', fields: {} }, 20, false).kind).toBe('Pass')
  expect(() =>
    readPythonNode(
      {
        kind: 'Expr',
        id: '1',
        fields: {
          value: {
            kind: 'Name',
            id: '1',
            fields: { id: 'x', ctx: { kind: 'Load', id: '3', fields: {} } },
          },
        },
      },
      20,
    ),
  ).toThrow('Nó')
  expect(() =>
    readPythonNode({ kind: 'Pass', range: { start: 0, end: 21 }, fields: {} }, 20, false),
  ).toThrow('Intervalo')
})
