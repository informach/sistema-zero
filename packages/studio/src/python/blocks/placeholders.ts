import type { PythonNode } from '../language/types'
import type { PythonBlockRole } from './contract'
import { integer, name, node, pass } from './nodes'

/** Placeholder nodes validate the layout, but are never used to fill a learner's missing value. */
export function pythonPlaceholderNode(role: PythonBlockRole): PythonNode {
  if (role === 'statement') return pass()
  if (role === 'parameter')
    return node('arg', { arg: 'valor', annotation: null, type_comment: null })
  if (role === 'parameters')
    return node('arguments', {
      posonlyargs: [],
      args: [],
      vararg: null,
      kwonlyargs: [],
      kw_defaults: [],
      kwarg: null,
      defaults: [],
    })
  if (role === 'keyword') return node('keyword', { arg: 'valor', value: integer('0') })
  if (role === 'handler')
    return node('ExceptHandler', { type: name('ValueError'), name: null, body: [pass()] })
  if (role === 'alias') return node('alias', { name: 'math', asname: null })
  if (role === 'format')
    return node('FormattedValue', {
      value: integer('0'),
      conversion: { literal: 'int', value: '-1' },
      format_spec: null,
    })
  return name('valor')
}
