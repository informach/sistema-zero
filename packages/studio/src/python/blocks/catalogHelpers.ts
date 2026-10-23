import type { PythonBlockRole, PythonCategory } from './contract'
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
