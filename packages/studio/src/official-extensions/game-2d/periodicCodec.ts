import type * as Babel from '@babel/types'
import type { JSExpr, JSStatement } from '../../ir/schema'

/** Só um laço cujo corpo inteiro é a consulta equivale a uma raiz periódica. */
export function gameTwoDPeriodicLoopToIR(
  fn: Babel.Node | undefined,
  expression: (node: Babel.Node | undefined) => JSExpr | null,
  body: (node: Babel.Node) => JSStatement[],
): JSStatement | undefined {
  if (
    !fn ||
    (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression') ||
    fn.async ||
    fn.generator ||
    fn.params.length ||
    fn.body.type !== 'BlockStatement' ||
    fn.body.body.length !== 1
  )
    return
  const statement = fn.body.body[0]
  if (
    statement?.type !== 'IfStatement' ||
    statement.alternate ||
    statement.test.type !== 'CallExpression'
  )
    return
  const call = statement.test
  if (
    call.callee.type !== 'MemberExpression' ||
    call.callee.computed ||
    call.callee.object.type !== 'Identifier' ||
    call.callee.object.name !== 'SZGame2D' ||
    call.callee.property.type !== 'Identifier' ||
    call.arguments.length !== 2 ||
    call.arguments[0]?.type !== 'StringLiteral'
  )
    return
  const method = call.callee.property.name
  if (!['everyFrames', 'everySeconds', 'afterSeconds'].includes(method)) return
  const value = expression(call.arguments[1])
  if (!value) return
  const common = { key: call.arguments[0].value, body: body(statement.consequent) }
  if (method === 'everyFrames') return { type: 'g2d:everyFrames', n: value, ...common }
  if (method === 'everySeconds') return { type: 'g2d:everySeconds', seconds: value, ...common }
  return { type: 'g2d:afterSeconds', seconds: value, ...common }
}

export function periodicKeyFromBlock(data: string | null | undefined): { key?: string } {
  if (!data) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return {}
  }
  if (parsed && typeof parsed === 'object' && 'periodicKey' in parsed) {
    if (typeof parsed.periodicKey !== 'string')
      throw new Error('A chave do temporizador precisa ser texto.')
    return { key: parsed.periodicKey }
  }
  return {}
}

export function withPeriodicKey<T extends { data?: string }>(block: T, key: string | undefined): T {
  if (key !== undefined) block.data = JSON.stringify({ periodicKey: key })
  return block
}
