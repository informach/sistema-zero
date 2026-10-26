import type { PythonNode } from '../language/types'
import type {
  PythonBlockInput,
  PythonBlockRole,
  PythonBlockShape,
  PythonCategory,
} from './contract'
import { PYTHON_MAX_ITEMS } from './shapeControls'
import type { StructuralSlot } from './structuralCodec'

export const metadata = (
  id: string,
  title: string,
  category: PythonCategory,
  level: 1 | 2 | 3,
  role: PythonBlockRole,
  api: string,
  help: string,
) => ({ id: `sz_py_${id}`, owner: 'programming' as const, title, category, level, role, api, help })
export const valueSlot = (
  field: string,
  label: string,
  optional = false,
  role: PythonBlockRole = 'value',
): StructuralSlot => ({ field, label, kind: 'node', role, optional })
export const listSlot = (
  field: string,
  label: string,
  role: PythonBlockRole = 'value',
): StructuralSlot => ({ field, label, kind: 'list', role })
export const bodySlot = (field: string, label: string): StructuralSlot => ({
  field,
  label,
  kind: 'body',
  role: 'statement',
  empty: field === 'body' ? 'pass' : undefined,
})
export const textSlot = (field: string, label: string, optional = false): StructuralSlot => ({
  field,
  label,
  kind: 'text',
  role: 'value',
  optional,
})

/** A Python identifier (a name the learner types in a field). */
export const PYTHON_IDENTIFIER = /^[_\p{ID_Start}][_\p{ID_Continue}]*$/u

/**
 * A block's inputs, read by name. A block with many numbered sockets passes the map of
 * `pythonInputsByName` once, so each read is a lookup instead of a scan.
 */
export type PythonInputSource = PythonBlockShape | ReadonlyMap<string, PythonBlockInput>
export function shapeInput(source: PythonInputSource, key: string) {
  return source instanceof Map
    ? source.get(key)
    : (source as PythonBlockShape).inputs.find((input) => input.name === key)
}
/** The one value an input must hold. */
export function requiredInput(source: PythonInputSource, key: string): PythonNode {
  const found = shapeInput(source, key)
  if (found?.nodes.length !== 1) throw new Error('Preencha todas as entradas do bloco.')
  return found.nodes[0]!
}
/** A field the block always has. */
export function requiredField(shape: PythonBlockShape, key: string) {
  const value = shape.fields.find((field) => field.name === key)?.value
  if (value === undefined) throw new Error('O bloco Python perdeu um campo obrigatório.')
  return value
}
/** A count option (`args:count`), checked against the block's limits. */
export function shapeCount(shape: PythonBlockShape, key: string, minimum = 0) {
  const value = shape.extra?.[key]
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > PYTHON_MAX_ITEMS
  )
    throw new Error('Quantidade de entradas inválida.')
  return value
}
