import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import type { PythonNode } from '../language/types'

/** Programming categories, in teaching order. The palette shows them in exactly this order. */
export const PYTHON_CATEGORIES = [
  'Variáveis',
  'Entrada e saída',
  'Lógica e decisões',
  'Repetições',
  'Números e matemática',
  'Textos',
  'Listas e coleções',
  'Funções',
  'Som',
  'Módulos',
  'Classes e objetos',
  'Tratamento de erros',
] as const
export type PythonCategory = (typeof PYTHON_CATEGORIES)[number]
/** Owners of block codecs: the core language or one official Python extension. */
export type PythonBlockOwner =
  | 'programming'
  | 'python-turtle'
  | 'python-pgzero'
  | 'python-pygame'
  | 'python-raylib-2d'
  | 'python-raylib-3d'
/**
 * Socket kinds: each one is a Blockly connection check, so a piece only plugs where Python
 * accepts that syntax (a `case` only inside `match`, a pattern only after `case`, a
 * `for … in …` clause only inside a comprehension).
 */
export const PYTHON_BLOCK_ROLES = [
  'value',
  'statement',
  'parameter',
  'parameters',
  'keyword',
  'handler',
  'alias',
  'format',
  'case',
  'pattern',
  'comprehension',
] as const
export type PythonBlockRole = (typeof PYTHON_BLOCK_ROLES)[number]
/** Built-in receivers a method block can require: a literal, a collection or an open file. */
export type PythonReceiverKind = 'text' | 'List' | 'Tuple' | 'Dict' | 'Set' | 'file'

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
  owner: PythonBlockOwner
  title: string
  category: PythonCategory | string
  level: 1 | 2 | 3
  role: PythonBlockRole
  help: string
  api: string
  dependencies?: readonly string[]
  /** API availability is release-owned; an installed extension alone cannot add engine support. */
  requiredRuntimeFeatures?: readonly StudioPythonRuntimeFeature[]
  /** Extension-owned first palette; does not bypass host approval or installation. */
  starter?: boolean
  /** First-palette blocks this one stands in for when its extension is installed. */
  replacesStarters?: readonly string[]
  /** Hidden codecs decode existing code but are not offered in the palette. */
  hidden?: boolean
  /**
   * Value pieces read as their value inside a sentence, as in Scratch: no title, no field label.
   * 'quoted' frames a text in quotes so a text and a variable of the same name differ.
   * The title still names the block in the palette search and tooltips.
   */
  compact?: 'plain' | 'quoted'
  /** A specialized label is valid only when this root resolves to the official binding. */
  binding?: PythonBlockBinding
  /** Alias-aware extensions may derive the required binding from the actual call. */
  bindingFor?(node: PythonNode): PythonBlockBinding | undefined
  /** Other names the block also reads (`keys` in `keyboard[keys.SPACE]`): all must resolve. */
  alsoBound?: readonly PythonBlockBinding[]
  /** Method specialization needs a proven built-in receiver, not just a matching name. */
  receiverKinds?: readonly PythonReceiverKind[]
  /**
   * Projection index. Syntax kinds this codec can decode (default: the default node's kind),
   * and, for calls/command statements and definitions, the callee or definition names it
   * accepts. Codecs without names are tried for every node of their kinds.
   */
  match?: { kinds?: readonly string[]; names?: readonly string[] }
  controls?: readonly {
    key: string
    label: string
    kind: 'count' | 'optional'
    minimum?: number
    maximum?: number
  }[]
  reshape?(shape: PythonBlockShape, key: string, value: number | boolean): PythonBlockShape
  defaultNode(): PythonNode
  /**
   * Returns undefined when any syntax would be lost by the visual representation. The context
   * only refines presentation (e.g. module vs object receiver); encoding is always exact.
   */
  decode(node: PythonNode, context?: PythonDecodeContext): PythonBlockShape | undefined
  encode(shape: PythonBlockShape): PythonNode
}

export interface PythonDecodeContext {
  /** True when this Name refers to the given imported module (e.g. `t` after import turtle as t). */
  isModule?(nameNode: PythonNode, module: string): boolean
  /** Parameter names of the program's own function this Name calls, when it is defined once. */
  functionParams?(nameNode: PythonNode): readonly string[] | undefined
}

export interface PythonBlockBinding {
  root: string
  module?: string
  member?: string
  /** Object created by an official constructor, e.g. turtle.Turtle() or Actor('alien'). */
  instance?: string
  /** Name provided without import by an installed extension (Pygame Zero's screen, Actor…). */
  builtin?: string
  /** Module-level function an installed extension calls by name (Pygame Zero's draw…). */
  handler?: string
  /** The root may be the module itself (procedural form) or an `instance` object. */
  moduleOrInstance?: boolean
  /**
   * A distinctive method on a variable: any receiver counts unless the program proves it is
   * something else (assigned from another constructor, or an object of another provider).
   */
  anyReceiver?: boolean
}
