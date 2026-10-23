import type { PythonNode, PythonValue } from '../language/types'

export const node = (kind: string, fields: Record<string, PythonValue> = {}): PythonNode => ({
  kind,
  fields,
})
export const name = (id = 'valor', context: 'Load' | 'Store' | 'Del' = 'Load') =>
  node('Name', { id, ctx: node(context) })
export const text = (value = '') => node('Constant', { value, kind: null })
export const integer = (value = '0') =>
  node('Constant', { value: { literal: 'int', value }, kind: null })
export const none = () => node('Constant', { value: null, kind: null })
export const boolean = (value = true) => node('Constant', { value, kind: null })
export const pass = () => node('Pass')
export const call = (func: PythonNode, args: PythonNode[] = [], keywords: PythonNode[] = []) =>
  node('Call', { func, args, keywords })
export const attribute = (value: PythonNode, attr: string) =>
  node('Attribute', { value, attr, ctx: node('Load') })
export const expression = (value: PythonNode) => node('Expr', { value })
export const moduleNode = (body: PythonNode[]) => node('Module', { body, type_ignores: [] })
export const isNode = (value: PythonValue | undefined): value is PythonNode =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  'kind' in value &&
  'fields' in value
export const nodes = (value: PythonValue | undefined): value is PythonNode[] =>
  Array.isArray(value) && value.every(isNode)
export function contextOf(value: PythonNode) {
  return isNode(value.fields.ctx) ? value.fields.ctx.kind : undefined
}
export function withTargetContext(value: PythonNode, context: 'Store' | 'Del'): PythonNode {
  if (value.kind === 'Starred' && isNode(value.fields.value) && context === 'Store')
    return node('Starred', {
      ...value.fields,
      value: withTargetContext(value.fields.value, context),
      ctx: node(context),
    })
  if (value.kind === 'Name' || value.kind === 'Attribute' || value.kind === 'Subscript')
    return node(value.kind, { ...value.fields, ctx: node(context) })
  if ((value.kind === 'List' || value.kind === 'Tuple') && nodes(value.fields.elts))
    return node(value.kind, {
      ...value.fields,
      ctx: node(context),
      elts: value.fields.elts.map((child) => withTargetContext(child, context)),
    })
  throw new Error('Escolha uma variável, atributo ou item para receber o valor.')
}
/** Used for codec conformance, not as a source formatter or a content fingerprint. */
export function pythonSemanticTree(value: PythonValue): unknown {
  if (Array.isArray(value)) return value.map(pythonSemanticTree)
  if (!isNode(value)) return value
  return {
    kind: value.kind,
    fields: Object.fromEntries(
      Object.entries(value.fields).map(([key, child]) => [key, pythonSemanticTree(child)]),
    ),
  }
}
