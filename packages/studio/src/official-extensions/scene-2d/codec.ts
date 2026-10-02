import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import {
  isSceneNameBlock,
  type SceneNameKind,
  type SceneTarget,
  sceneBlockType,
  sceneLiteralShadow,
  sceneMethod,
  sceneMethods,
  sceneNameBlockType,
} from './catalog'
import { type SceneExpression, type SceneStatement, validSceneArgs } from './ir'

type ExpressionReader = (node: Babel.Node | null | undefined) => JSExpr | null
type BlockTools = {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
}
const literal = (value: string | number | boolean): JSExpr =>
  typeof value === 'number'
    ? { type: 'num', value }
    : typeof value === 'boolean'
      ? { type: 'bool', value }
      : { type: 'str', value }

const nameBlock = (target: SceneTarget, kind: SceneNameKind, name: string, id?: string) => ({
  type: sceneNameBlockType(target, kind),
  ...(id ? { id } : {}),
  fields: { NAME: name },
})

export function sceneBlockExpression(block: Blockly.Block, tools: BlockTools): JSExpr | undefined {
  if (isSceneNameBlock(block.type)) return literal(tools.field(block, 'NAME'))
  const parsed = readBlock(block, tools, true)
  if (parsed)
    return {
      method: parsed.method,
      args: parsed.args,
      type: parsed.target === 'g2d' ? 'g2d:sceneValue' : 'gk:sceneValue',
    }
}
export function sceneBlockStatement(
  block: Blockly.Block,
  tools: BlockTools,
  statements?: (block: Blockly.Block, name: string) => JSStatement[],
): SceneStatement | undefined {
  const parsed = readBlock(block, tools, false)
  const entry = parsed && sceneMethod(parsed.method, parsed.target)
  if (parsed && entry && (entry.event || entry.each)) {
    if (!statements) return
    return {
      method: parsed.method,
      args: parsed.args,
      type: entry.each
        ? 'gk:sceneEach'
        : parsed.target === 'g2d'
          ? 'g2d:sceneEvent'
          : 'gk:sceneEvent',
      body: statements(block, 'BODY'),
      ...(entry.parameter ? { parameter: tools.field(block, 'PARAM') || entry.parameter } : {}),
    }
  }
  if (parsed)
    return {
      method: parsed.method,
      args: parsed.args,
      type: parsed.target === 'g2d' ? 'g2d:sceneCommand' : 'gk:sceneCommand',
    }
}
function readBlock(block: Blockly.Block, tools: BlockTools, value: boolean) {
  const target: SceneTarget = block.type.startsWith('sz_g2d_') ? 'g2d' : 'gk'
  const entry = sceneMethods(target).find(
    (item) => sceneBlockType(target, item) === block.type && !!item.value === value,
  )
  if (!entry) return
  const args = entry.args.map((arg) =>
    arg.field === 'sprite'
      ? { type: 'var' as const, name: tools.field(block, arg.name) }
      : arg.field
        ? literal(
            typeof arg.value === 'number'
              ? Number(tools.field(block, arg.name))
              : tools.field(block, arg.name),
          )
        : // An empty name socket is an empty name, which the runtime reports. Falling
          // back to the palette name would create a layer the child never named.
          tools.expression(block, arg.name, literal(arg.declares || arg.picks ? '' : arg.value)),
  )
  if (validSceneArgs(entry.method, args, value, target))
    return { target, method: entry.method, args }
}

function readCall(
  target: SceneTarget,
  method: string,
  nodes: readonly Babel.Node[],
  value: boolean,
  expression: ExpressionReader,
  simple: (expr: JSExpr | null) => boolean,
) {
  const entry = sceneMethod(method, target)
  if (!entry || !!entry.value !== value || nodes.length !== entry.args.length) return
  const args: JSExpr[] = []
  for (const node of nodes) {
    const arg = expression(node)
    if (!arg || !simple(arg)) return
    args.push(arg)
  }
  if (validSceneArgs(method, args, value, target)) return { method: entry.method, args }
}
export function sceneCallExpression(
  target: SceneTarget,
  method: string,
  nodes: readonly Babel.Node[],
  expression: ExpressionReader,
  simple: (expr: JSExpr | null) => boolean,
): SceneExpression | undefined {
  const call = readCall(target, method, nodes, true, expression, simple)
  if (call) return { type: target === 'g2d' ? 'g2d:sceneValue' : 'gk:sceneValue', ...call }
}
export function sceneCallStatement(
  target: SceneTarget,
  method: string,
  nodes: readonly Babel.Node[],
  expression: ExpressionReader,
  simple: (expr: JSExpr | null) => boolean,
  functionBody?: (fn: Babel.FunctionExpression | Babel.ArrowFunctionExpression) => JSStatement[],
): SceneStatement | undefined {
  const entry = sceneMethod(method, target)
  if (entry?.event || entry?.each) {
    const fn = nodes[nodes.length - 1]
    if (
      !functionBody ||
      !fn ||
      (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression') ||
      fn.params.length !== (entry.parameter ? 1 : 0) ||
      (entry.parameter && fn.params[0]?.type !== 'Identifier') ||
      fn.async ||
      fn.generator
    )
      return
    const call = readCall(target, method, nodes.slice(0, -1), false, expression, simple)
    if (call)
      return {
        type: entry.each ? 'gk:sceneEach' : target === 'g2d' ? 'g2d:sceneEvent' : 'gk:sceneEvent',
        ...call,
        body: functionBody(fn),
        ...(fn.params[0]?.type === 'Identifier' ? { parameter: fn.params[0].name } : {}),
      }
    return
  }
  const call = readCall(target, method, nodes, false, expression, simple)
  if (call) return { type: target === 'g2d' ? 'g2d:sceneCommand' : 'gk:sceneCommand', ...call }
}
export function sceneToCode(
  node: SceneStatement | SceneExpression,
  expression: (expr: JSExpr) => string,
  body?: (statements: JSStatement[]) => string,
  pad = '',
): string {
  const api = node.type.startsWith('g2d:') ? 'SZGame2D' : 'SZGameKit'
  const args = node.args.map(expression)
  if ('body' in node)
    args.push(
      `function (${node.parameter ? expression({ type: 'var', name: node.parameter }) : ''}) {\n${body?.(node.body) ?? ''}\n${pad}}`,
    )
  return `${api}.${node.method}(${args.join(', ')})`
}

export function sceneToBlock(
  node: SceneStatement | SceneExpression,
  expression: (expr: JSExpr) => SerializedBlocklyBlock | null,
  statements?: (statements: JSStatement[]) => SerializedBlocklyBlock[],
): SerializedBlocklyBlock | undefined {
  const target: SceneTarget = node.type.startsWith('g2d:') ? 'g2d' : 'gk'
  const entry = sceneMethod(node.method, target)
  if (!entry || !validSceneArgs(node.method, node.args, !!entry.value, target)) return
  const fields: Record<string, string | number> = {}
  if ('body' in node && node.parameter) fields.PARAM = node.parameter
  const inputs: NonNullable<SerializedBlocklyBlock['inputs']> = {}
  for (let index = 0; index < entry.args.length; index++) {
    const arg = entry.args[index],
      expr = node.args[index]
    if (!arg || !expr) return
    if (arg.field === 'sprite') {
      if (expr.type !== 'var') return
      fields[arg.name] = expr.name
    } else if (arg.field) {
      if (expr.type !== 'str' && !(arg.field === 'select' && expr.type === 'num')) return
      fields[arg.name] = String(expr.value)
    } else if (arg.picks && expr.type === 'str') {
      // A fixed name returns to the list the socket was born with.
      inputs[arg.name] = { shadow: nameBlock(target, arg.picks, expr.value, expr.__id) }
    } else {
      const block = expression(expr)
      if (!block) return
      // What the socket is born with stays underneath: pulled out, a computed value
      // leaves the list (or the number) behind, never an empty socket.
      const born = arg.picks
        ? nameBlock(target, arg.picks, String(arg.value))
        : sceneLiteralShadow(arg)
      // A plain literal of the socket's own kind IS that shadow again.
      inputs[arg.name] =
        !arg.picks && block.type === born.type && !block.inputs
          ? { shadow: block }
          : { block, shadow: born }
    }
  }
  if ('body' in node) {
    if (!statements) return
    const children = statements(node.body)
    for (let i = 0; i < children.length - 1; i++) children[i]!.next = { block: children[i + 1]! }
    if (children[0]) inputs.BODY = { block: children[0] }
  }
  return {
    type: sceneBlockType(target, entry),
    id: node.__id,
    fields,
    inputs,
  }
}
