import type { PythonNode } from '../language/types'

export const PYTHON_CATEGORIES = [
  'Variáveis',
  'Entrada e saída',
  'Lógica e decisões',
  'Repetições',
  'Números e matemática',
  'Textos',
  'Listas e coleções',
  'Funções',
  'Módulos',
  'Classes e objetos',
  'Tratamento de erros',
] as const
export type PythonCategory = (typeof PYTHON_CATEGORIES)[number]
export type PythonBlockRole =
  | 'value'
  | 'statement'
  | 'parameter'
  | 'parameters'
  | 'keyword'
  | 'handler'
  | 'alias'
  | 'format'
export interface PythonBlockField {
  name: string
  label: string
  value: string
  options?: readonly (readonly [label: string, value: string])[]
}
export interface PythonBlockInput {
  name: string
  label: string
  role: PythonBlockRole
  /** Statements are chained; value inputs have exactly one node. */
  nodes: PythonNode[]
}
export interface PythonBlockShape {
  fields: PythonBlockField[]
  inputs: PythonBlockInput[]
  /** Only scalar/list-shape data; never a hidden copy of the descendant tree. */
  extra?: Record<string, string | number | boolean>
}
export interface PythonBlockCodec {
  id: string
  owner: 'programming' | 'python-turtle'
  title: string
  category: PythonCategory | string
  level: 1 | 2 | 3
  role: PythonBlockRole
  help: string
  api: string
  dependencies?: readonly string[]
  /** Extension-owned first palette; does not bypass host approval or installation. */
  starter?: boolean
  /** A specialized label is valid only when this root resolves to the official binding. */
  binding?: PythonBlockBinding
  /** Alias-aware extensions may derive the required binding from the actual call. */
  bindingFor?(node: PythonNode): PythonBlockBinding | undefined
  /** Method specialization needs a proven built-in receiver, not just a matching name. */
  receiverKinds?: readonly ('text' | 'List' | 'Tuple' | 'Dict' | 'Set')[]
  controls?: readonly {
    key: string
    label: string
    kind: 'count' | 'optional'
    minimum?: number
    maximum?: number
  }[]
  reshape?(shape: PythonBlockShape, key: string, value: number | boolean): PythonBlockShape
  defaultNode(): PythonNode
  /** Returns undefined when any syntax would be lost by the visual representation. */
  decode(node: PythonNode): PythonBlockShape | undefined
  encode(shape: PythonBlockShape): PythonNode
}

export interface PythonBlockBinding {
  root: string
  module?: string
  member?: string
  instance?: 'Turtle' | 'Screen'
}
